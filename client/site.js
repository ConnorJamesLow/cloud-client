function init() {
  initApp();
  App.actions.loadMessages();
  App.dom.updateName();
  App.elements.input.keyup((ev) => {
    if (ev.which === 13) {
      App.actions.sendMessage();
    }
  });
}

$(document).ready(init);
