var _id = document.getElementById.bind(document);
var noop = function() {};

function showStatus(message) {
  var status = _id('status');
  status.textContent = message;
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

function fetchToken(callbackFn) {
  var url = getDSUrl();
  var callbackFn = typeof(callbackFn) === "function" ? callbackFn : noop;

  showStatus('Fetching token...');

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url + '/webman/login.cgi', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) {
      return;
    }

    if (xhr.status === 200) {
      try {
        var resp = JSON.parse(xhr.responseText);
        if (resp.SynoToken) {
          _id('token').value = resp.SynoToken;
          showStatus('');
          callbackFn();
        } else {
          showStatus('Please login your DS');
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

function setDefaultPort() {
  var host = _id('host');
  host.value = host.value.trim();

  if (host.value.match(/quickconnect.to$/)) {
    _id('port').value = _id('scheme').value == 'http' ? 80 : 443;
    _id('port').disabled = true;
    return;
  }

  _id('port').disabled = false;
}

function saveOptions() {
  if (!validateUrl(getDSUrl())) {
    return;
  }

  fetchToken(function() {
    var dsUrl = getDSUrl();
    var token = _id('token').value;
    var doNotification = _id('notification').checked;

    chrome.storage.sync.set({
      dsUrl: dsUrl,
      token: token,
      enablePolling: doNotification
    }, function() {
      showStatus('Options saved.');
    });
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

    setDefaultPort();
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);

_id('host').addEventListener('change', setDefaultPort);
_id('scheme').addEventListener('change', setDefaultPort);
_id('save').addEventListener('click', saveOptions);
_id('close').addEventListener('click', function() { window.close(); });

_id('show-advance').addEventListener('change', function(e) {
  document.querySelector('.advance-options').style.visibility =
    this.checked ? 'visible' : 'hidden';
});
