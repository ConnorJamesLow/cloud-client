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
      API_URL: location.href.indexOf('localhost') > 0
        ? 'http://localhost:8080/AnotherCloudApp/messaging'
        : 'https://gcucloud.herokuapp.com/messaging',
      LOAD_SIZE: 10,
    },
    state: {
      offset: 0,
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
      getMessageRange: (offset, count) => {
        const options = App.helpers.getOptions('GET', `getmessages?offset=${offset}&count=${count}`);
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
      }
    },
    helpers: {
      updateOffset: () => {
        App.state.offset += App.constants.LOAD_SIZE;
      },
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
      loadMessages: () => {
        const promise = App.requests.getMessageRange(App.state.offset, App.constants.LOAD_SIZE);
        promise.done(response => {
          if (response.length > 0) {
            App.dom.prependMessagesToChat(response);
          } else {
            App.dom.disableLoader();
          }
        });
        App.helpers.updateOffset();
      },
      sendMessage: () => {
        const message = App.elements.input.val();
        App.requests.sendMessage(message).done(response => {
          App.dom.appendMessagesToChat([{
            messagebody: message,
            sender: App.state.name
          }]);
          App.dom.clearMessageBox();
        });
      },
      setName: () => {
        const name = $('#name-input').val();
        Utils.setCookie('nickname', name, 14);
        App.state.name = name;
        App.dom.destroyNicknameChooser();
      }
    },
    dom: {
      prependMessagesToChat: (data) => {
        data.forEach((message) => {
          const html = App.templates.message(message.sender, message.messagebody, message.sender === App.state.name);
          App.elements.messages.prepend(html);
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
      destroyNicknameChooser: () => {
        console.log('destroy!');
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
      message: (name, message, isUser = false) => {
        return `
          <div class="app-message${isUser ? ' self' : ''}">
            <div class="app-message-sender">
              ${name}
            </div>
            <div class="app-message-payload">
              ${message}
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
