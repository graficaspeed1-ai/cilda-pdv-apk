/* Compatibilidade ES5/WebView legado: polyfill Element.closest e Element.matches. */
(function(){
  if(!Element.prototype.matches){
    Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector||function(selector){
      var list=(this.document||this.ownerDocument).querySelectorAll(selector),i=0;
      while(list[i]&&list[i]!==this)i++;
      return !!list[i];
    };
  }
  if(!Element.prototype.closest){
    Element.prototype.closest=function(selector){
      var node=this;
      while(node&&node.nodeType===1){
        if(node.matches(selector))return node;
        node=node.parentElement||node.parentNode;
      }
      return null;
    };
  }
})();
