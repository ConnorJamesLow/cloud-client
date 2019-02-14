function init() {
  initApp();
  App.actions.loadMessages();
  App.dom.updateName();
  App.elements.input.keyup((ev) => {
    if (ev.which === 13 && App.elements.input.val().trim().length > 0) {
      App.actions.sendMessage();
    }
  });
}

$(document).ready(init);
