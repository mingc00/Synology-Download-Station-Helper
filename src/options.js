var _id = document.getElementById.bind(document);

function showStatus(message) {
  var status = _id('status');
  status.textContent = message;
  setTimeout(function() {
    status.textContent = '';
  }, 1800);
}

function getDSUrl() {
  var scheme = _id('scheme').value;
  var host = _id('host').value;
  var port = _id('port').value;
  return scheme + '://' + host + ':' + port;
}

function validateUrl(url) {
  if (!re_weburl.test(url)) {
    showStatus("URL is invalid!");
    return false;
  }
  return true;
}

function fetchToken() {
  var url = getDSUrl();

  if (!validateUrl(url)) {
    return;
  }

  _id('token').value = '';
  showStatus('Fetching token...');

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url + '/webman/login.cgi', true);
  xhr.onreadystatechange = function() {
    console.log(xhr.readyState, xhr.status);
    if (xhr.readyState !== 4) {
      return;
    }

    if (xhr.status === 200) {
      console.log(xhr.responseText);
      try {
        var resp = JSON.parse(xhr.responseText);
        if (resp.SynoToken) {
          _id('token').value = resp.SynoToken;
        }
      } catch (e) {
        showStatus('Failed to connect "' + url + '"');
      }
    } else {
      showStatus('Failed to connect "' + url + '"');
    }
  }
  xhr.send();
}

function saveOptions() {
  var dsUrl = getDSUrl();
  var token = _id('token').value;
  var doNotification = _id('notification').checked;

  if (!validateUrl(dsUrl)) {
    return;
  }

  if (!token) {
    showStatus('No Syno Token');
    return;
  }

  chrome.storage.sync.set({
    dsUrl: dsUrl,
    token: token,
    enablePolling: doNotification
  }, function() {
    showStatus('Options saved.');
    setTimeout(function() { window.close() }, 1000);
  });
}

function restoreOptions() {
  chrome.storage.sync.get(['dsUrl', 'token', 'enablePolling'], function(items) {
    if (items.dsUrl) {
      var parser = document.createElement('a');
      parser.href = items.dsUrl;

      _id('host').value = parser.hostname;
      _id('port').value = parser.port;

      var option = document.querySelector(
        '#scheme option[value=' + parser.protocol.slice(0, -1) + ']');
      if (option) {
        option.selected = true;
      }
    }

    if (items.token) {
      _id('token').value = items.token;
    }

    if (items.hasOwnProperty('enablePolling')) {
      _id('notification').checked = items.enablePolling;
    }
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
_id('fetch-token').addEventListener('click', fetchToken);
_id('save').addEventListener('click', saveOptions);
