function initApp() {
  Utils = {
    getCookie: (name) => {
      const key = `${name}=`;
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i += 1) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(key) === 0) {
          return c.substring(key.length, c.length);
        }
      }
      return false;
    },
    setCookie: (name, value, daysTillExpiration) => {
      const d = new Date();
      d.setTime(d.getTime() + (daysTillExpiration * 24 * 60 * 60 * 1000));
      const expires = `expires=${d.toUTCString()}`;
      document.cookie = `${name}=${value};${expires};path=/`;
    }
  };
  App = {
    constants: {
      // API_URL: location.href.indexOf('localhost') > 0
      //   ? 'http://localhost:8080/AnotherCloudApp/messaging'
      //   : 'https://gcucloud.herokuapp.com/messaging',
      API_URL: 'https://gcucloud.herokuapp.com/messaging',
      LOAD_SIZE: 10,
    },
    state: {
      offset: 0,
      topIndex: 0,
      name: (() => {

        // try to get the name from a cookie
        const name = Utils.getCookie('nickname');
        Utils.setCookie('nickname', name, 14);
        if (!!name & name != 'false') {
          return name;
        }

        // if no cookie is found, prompt user for a nickname
        $('#overlay').addClass('d-flex').removeClass('d-none');
        return null;
      })()
    },
    requests: {
      getNewMessages: () => {
        const options = App.helpers.getOptions('GET', `get-new-messages?index=${App.state.topIndex}`);
        return $.ajax(options);
      },
      getMessageRange: (index, count) => {
        const options = App.helpers.getOptions('GET', `getmessages?index=${index}&count=${count}`);
        return $.ajax(options);
      },
      sendMessage: (message) => {
        const options = App.helpers.getOptions('POST', 'sendmessage');
        options.data = JSON.stringify({
          'messagebody': message,
          'creationdate': moment(new Date()).format('Y-MM-DD hh:mm:ss'),
          'sender': App.state.name
        });
        options.processData = false;
        options.headers["Content-Type"] = 'application/json';
        console.log(options);
        return $.ajax(options);
      },
      updateMessage: (message, id) => {
        const options = App.helpers.getOptions('PUT', 'updatemessage');
        options.data = JSON.stringify({
          'id': id,
          'messagebody': message
        });
        options.processData = false;
        options.headers["Content-Type"] = 'application/json';
        return $.ajax(options);
      },
      deleteMessage: (id) => {
        const options = App.helpers.getOptions('DELETE', `deletemessage/${id}`);
        return $.ajax(options);
      }
    },
    helpers: {
      getOptions(method, uri) {
        return {
          async: true,
          crossDomain: true,
          url: `${App.constants.API_URL}/${uri}`,
          method: method,
          headers: {
            'cache-control': 'no-cache'
          }
        }
      }
    },
    actions: {
      init: () => {
        App.actions.loadMessages();
        App.dom.updateName();
        App.elements.input.keyup((ev) => {
          if (ev.which === 13) {
            App.actions.sendMessage();
          }
        });
        App.state.listener = setInterval(App.actions.loadRecent, 1500);
      },
      loadRecent: () => {
        const promise = App.requests.getNewMessages();
        promise.done(response => {
          if (response.length > 0) {
            const recent = response[response.length - 1].id;
            console.log('recent:', recent, 'top index:', App.state.topIndex);
            if (recent > App.state.topIndex) {
              App.state.topIndex = recent;
              App.dom.appendMessagesToChat(response);
            }
          }
        });
      },
      loadMessages: () => {
        const promise = App.requests.getMessageRange(App.state.offset, App.constants.LOAD_SIZE);
        promise.done(response => {
          if (response.length > 0) {
            if (App.state.topIndex === 0) {
              App.state.topIndex = response[0].id;
              console.log(App.state.topIndex);
            }
            App.dom.prependMessagesToChat(response);
          } else {
            App.dom.disableLoader();
          }
        });
      },
      sendMessage: () => {
        const message = App.elements.input.val();
        if (message.trim().length > 0) {
          App.requests.sendMessage(message).done(() => {
            // App.dom.appendMessagesToChat([{
            //   messagebody: message,
            //   sender: App.state.name
            // }]);
            App.dom.clearMessageBox();
          });
        }
      },
      updateMessage: (id) => {
        const message = $('#update-input').val();
        App.requests.updateMessage(message, id).done(() => {
          App.dom.destoryEditor();
          $(`#payload-${id}`).html(message);
        });
      },
      deleteMessage: (id) => {
        const confirmDelete = function (result) {
          if (result.value) {
            App.requests.deleteMessage(id).done(() => {
              $(`#message-${id}`).remove();
            });
          }
          else {
            swal('Deletion canceled!', '', 'info');
          }
        };
        swalO = {
          title: 'Confirm',
          text: 'Are you sure you want to delete this message?',
          type: 'warning',
          showCancelButton: true,
        };
        swal(swalO).then(confirmDelete);
      },
      setName: () => {
        const name = $('#name-input').val();
        Utils.setCookie('nickname', name, 14);
        App.state.name = name;
        App.dom.destoryEditor();
      }
    },
    dom: {
      prependMessagesToChat: (data) => {
        data.forEach((message) => {
          const html = App.templates.message(message.sender, message.messagebody, message.id, message.creationdate);
          App.elements.messages.prepend(html);
          App.state.offset = message.id;
        });
      },
      appendMessagesToChat: (data) => {
        console.log(data);
        data.forEach((message) => {
          const html = App.templates.message(message.sender, message.messagebody, message.sender === App.state.name);
          App.elements.messages.append(html);
        });
        App.dom.scrollToBottom();
      },
      clearMessageBox: () => {
        App.elements.input.val('');
      },
      showEditor: (id) => {
        const message = $(`#message-${id}`);
        const text = message.data('message');
        $('body').prepend(App.templates.messageEditor(id, text));
      },
      destoryEditor: () => {
        $('#overlay').addClass('d-none');
        $('#overlay').removeClass('d-flex');
        $('#overlay').html('');
      },
      disableLoader: () => {
        App.elements.loader.addClass('app-disabled');
        App.elements.loader.html('No more messages');
      },
      updateName: () => {
        App.elements.name.html(App.state.name);
      },
      scrollToBottom: () => {
        App.elements.card.scrollTop(App.elements.card[0].scrollHeight);
      }
    },
    templates: {
      message: (name, message, id, creationdate) => {
        const isUser = name === App.state.name;
        return `
          <div class="app-message${isUser ? ' self' : ''}" id="message-${id}"
              data-sender="${name}" data-message="${message}" data-id="${id}" data-creationdate="${creationdate}">
            <div class="app-message-content">
              <div class="app-message-sender" id="sender-${id}">
                ${name}
              </div>
              <div class="app-message-payload" id="payload-${id}">
                ${message}
              </div>
            </div>
            <div class="message-meta d-flex justify-content-between mx-2">
              <div class="app-message-timestamp small text-black-50">${moment(creationdate).format('dddd MMM DD, Y @ hh:mm A')}</div>
              ${isUser ? `<div class="d-flex">
                <div class="app-message-tool mr-2 app-text" onclick="App.dom.showEditor(${id})">
                  <i class="fas fa-edit"></i>
                </div>
                <div class="app-message-tool mr-2 app-text" onclick="App.actions.deleteMessage(${id})">
                  <i class="fas fa-eraser"></i>
                </div>
              </div>` : '<div></div>'}
            </div>
          </div>`;
      },
      nickname: () => {
        return `
          <div class="align-items-center h-100 justify-content-around position-absolute w-100 app-overlay d-none" id="overlay">
            <div id="name" class="rounded p-4 w-50 app-bg-p app-border text-white">
              <div class="mb-3">
                <h4>Who are you?</h4>
              </div>
              <div class="input-group input-group-lg mb-3">
                <div class="input-group-prepend">
                  <span class="input-group-text app-bg-p-dark text-light app-border">Nickname</span>
                </div>
                <input class="form-control" id="name-input" maxlength="24" />
              </div>
              <button class="btn app-btn-outline-s btn-block btn-lg" onclick="App.actions.setName()">Okay, let's chat</button>
            </div>
          </div>`;
      },
      messageEditor: (id, message) => {
        return `
          <div class="align-items-center h-100 justify-content-around position-absolute w-100 app-overlay d-flex" id="overlay">
            <div id="name" class="rounded p-4 w-50 app-bg-p app-border text-white">
              <div class="mb-3">
                <h4>Who are you?</h4>
              </div>
              <div class="input-group input-group-lg mb-3">
                <div class="input-group-prepend">
                  <span class="input-group-text app-bg-p-dark text-light app-border">Message</span>
                </div>
                <input class="form-control" id="update-input" maxlength="140" value="${message}"/>
              </div>
              <div class="mb-3">
                <button class="btn app-btn-outline-s btn-block btn-lg" onclick="App.actions.updateMessage(${id})">Update it</button>
              </div>
              <div class="mb-3">
                <button class="btn app-btn-outline-s btn-block btn-lg" onclick="App.dom.destoryEditor()">Wait, cancel</button>
              </div>
            </div>
          </div>`;
      }
    },
    elements: {
      input: $('#message-input'),
      messages: $('#message-board'),
      name: $('#display-name'),
      loader: $('#load-messages'),
      card: $('.card-body')
    }
  }
}
