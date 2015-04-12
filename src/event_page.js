var pollingInterval = 1;

function request(path, params, onSuccess, onError) {
  var onError = onError || function() {};

  var encodedParams = [];
  for (var k in params) {
    encodedParams.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
  }

  var url = localStorage['dsUrl'] + path;

  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  if (localStorage['token']) {
    xhr.setRequestHeader('X-SYNO-TOKEN', localStorage['token']);
  }
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var resp = JSON.parse(xhr.responseText);

      if (resp.errinfo) {
        onError(resp);
      } else {
        onSuccess(resp);
      }
    }
  };

  xhr.send(encodedParams.join('&'));
}

var handleUrl = function(info) {
  if (!info.linkUrl) {
    return;
  }

  var urls = [info.linkUrl];
  var params = {
    action: 'add_url_task',
    urls: JSON.stringify(urls)
  };

  request('/webman/3rdparty/DownloadStation/dlm/downloadman.cgi', params, function(resp) {
    console.log(resp);
  });
};

function onClickHandler(info) {
  if (info.menuItemId == 'add_link') {
    handleUrl(info);
  }
}

function showNotification(message) {
  chrome.notifications.create('finished', {
    'type': 'basic',
    'iconUrl': chrome.runtime.getURL('img/done_white_bg.png'),
    'title': 'Finished',
    'message': message,
    'priority': 2
  }, function() {});
}

function pollNotification(alarm) {
  if (alarm.name != 'get_notifications') {
    return;
  }

  var params = {
    action: 'load'
  };

  if (localStorage['lastPolling']) {
    params['lastRead'] = localStorage['lastPolling'];
    params['lastSeen'] = params['lastRead'];
  }

  request('/webman/modules/DSMNotify/dsmnotify.cgi', params, function(resp) {
    var unreadItems = [];
    if (resp.data) {
      unreadItems = resp.data.items.filter(function(e) {
        return e.className == 'SYNO.SDS.DownloadStation.Application' &&
          e.time > localStorage['lastPolling'];
      });
    }

    unreadItems.forEach(function(item) {
      showNotification(item.msg[2]);
    });

    if (unreadItems.length > 0) {
      localStorage['lastPolling'] = unreadItems[unreadItems.length - 1].time;
    }

  });
}

chrome.contextMenus.onClicked.addListener(onClickHandler);
chrome.alarms.onAlarm.addListener(pollNotification);
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    'title': 'Add to DownloadStation',
    'contexts': [ 'link' ],
    'id': 'add_link'
  });

  if (!localStorage.hasOwnProperty('lastPolling')) {
    localStorage['lastPolling'] = Math.floor(Date.now() / 1000);
  }
});

chrome.storage.onChanged.addListener(function(changes) {
  if (changes.dsUrl) {
    localStorage['dsUrl'] = changes.dsUrl.newValue;
  }

  if (changes.token) {
    localStorage['token'] = changes.token.newValue;
  }

  if (changes.enablePolling) {
    if (changes.enablePolling.newValue == true) {
      chrome.alarms.create('get_notifications', { periodInMinutes: pollingInterval });
    } else {
      chrome.alarms.clear('get_notifications');
    }
  }
});
