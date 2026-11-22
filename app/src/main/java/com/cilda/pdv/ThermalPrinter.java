
package com.cilda.pdv;

import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.widget.EditText;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Impressão ESC/POS para impressoras térmicas (58mm / 80mm).
 * Suporta Bluetooth (impressora pareada) e rede (IP, porta 9100).
 */
public class ThermalPrinter {
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final String PREFS = "printer";
    private static final String KEY = "target";
    /** Troque para true se a impressora tiver guilhotina (corte automático). */
    private static final boolean CUT = false;

    private final Activity act;

    public ThermalPrinter(Activity act) {
        this.act = act;
    }

    private void toast(final String msg) {
        act.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(act, msg, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Imprime o texto na impressora salva (ou pede para escolher uma). */
    public void print(final String text) {
        SharedPreferences sp = act.getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        String target = sp.getString(KEY, null);
        if (target == null) {
            act.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    choose(text);
                }
            });
        } else {
            send(target, text);
        }
    }

    /** Mostra a lista de impressoras (chamar na thread da interface). */
    public void choose(final String pendingText) {
        final List<String> labels = new ArrayList<String>();
        final List<String> targets = new ArrayList<String>();
        try {
            BluetoothAdapter ad = BluetoothAdapter.getDefaultAdapter();
            if (ad != null && ad.isEnabled()) {
                Set<BluetoothDevice> bonded = ad.getBondedDevices();
                if (bonded != null) {
                    for (BluetoothDevice d : bonded) {
                        labels.add(d.getName() + "  (" + d.getAddress() + ")");
                        targets.add("bt:" + d.getAddress());
                    }
                }
            }
        } catch (Exception ignored) {
        }
        labels.add("Impressora de rede (IP)...");
        targets.add("ip:");

        new AlertDialog.Builder(act)
                .setTitle("Escolha a impressora (pareie antes em Configurações > Bluetooth)")
                .setItems(labels.toArray(new CharSequence[labels.size()]),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                String t = targets.get(which);
                                if ("ip:".equals(t)) askIp(pendingText);
                                else save(t, pendingText);
                            }
                        })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void askIp(final String pendingText) {
        final EditText input = new EditText(act);
        input.setHint("192.168.0.50  (porta 9100)");
        new AlertDialog.Builder(act)
                .setTitle("IP da impressora")
                .setView(input)
                .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String ip = input.getText().toString().trim();
                        if (ip.length() > 0) save("ip:" + ip, pendingText);
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void save(String target, String pendingText) {
        act.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
                .edit().putString(KEY, target).commit();
        if (pendingText != null) {
            send(target, pendingText);
        } else {
            send(target, "CILDA PDV\nTeste de impressao OK\n" + new Date().toString() + "\n");
        }
    }

    private void send(final String target, final String text) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] data = build(text);
                    if (target.startsWith("bt:")) {
                        writeBluetooth(target.substring(3), data);
                    } else if (target.startsWith("ip:")) {
                        writeNetwork(target.substring(3), data);
                    } else {
                        throw new IOException("Impressora não configurada");
                    }
                    toast("Enviado para a impressora");
                } catch (Exception e) {
                    toast("Erro ao imprimir: " + e.getMessage()
                            + "\n(toque em IMPRESSORA para escolher outra)");
                }
            }
        }).start();
    }

    private byte[] build(String text) throws IOException {
        String t = text == null ? "" : text.replace("\r", "");
        t = t.replace("\u2013", "-").replace("\u2014", "-").replace("\u2022", "*")
                .replace("\u201C", "\"").replace("\u201D", "\"")
                .replace("\u2018", "'").replace("\u2019", "'");
        // Remove acentos (compatível com qualquer impressora)
        t = Normalizer.normalize(t, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(new byte[]{0x1B, 0x40});            // ESC @ (inicializa)
        out.write(t.getBytes("US-ASCII"));
        out.write(new byte[]{0x0A, 0x0A, 0x0A, 0x0A}); // avança papel
        if (CUT) out.write(new byte[]{0x1D, 0x56, 0x42, 0x00}); // corte parcial
        return out.toByteArray();
    }

    private void writeBluetooth(String mac, byte[] data) throws Exception {
        BluetoothAdapter ad = BluetoothAdapter.getDefaultAdapter();
        if (ad == null || !ad.isEnabled()) throw new IOException("Bluetooth desligado");
        BluetoothDevice dev = ad.getRemoteDevice(mac);
        ad.cancelDiscovery();
        BluetoothSocket sock = null;
        try {
            sock = dev.createRfcommSocketToServiceRecord(SPP);
            sock.connect();
        } catch (IOException first) {
            try {
                if (sock != null) sock.close();
            } catch (IOException ignored) {
            }
            // Alternativa para impressoras que não respondem ao UUID padrão
            sock = (BluetoothSocket) dev.getClass()
                    .getMethod("createRfcommSocket", new Class[]{int.class})
                    .invoke(dev, 1);
            sock.connect();
        }
        try {
            OutputStream os = sock.getOutputStream();
            os.write(data);
            os.flush();
            Thread.sleep(1000);
        } finally {
            try {
                sock.close();
            } catch (IOException ignored) {
            }
        }
    }

    private void writeNetwork(String hostPort, byte[] data) throws Exception {
        String host = hostPort;
        int port = 9100;
        int idx = hostPort.indexOf(':');
        if (idx > 0) {
            host = hostPort.substring(0, idx);
            port = Integer.parseInt(hostPort.substring(idx + 1).trim());
        }
        Socket s = new Socket();
        try {
            s.connect(new InetSocketAddress(host, port), 5000);
            OutputStream os = s.getOutputStream();
            os.write(data);
            os.flush();
            Thread.sleep(500);
        } finally {
            try {
                s.close();
            } catch (IOException ignored) {
            }
        }
    }
}
