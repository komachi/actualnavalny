const Request = require("sdk/request").Request,
events = require("sdk/system/events"),
utils = require("sdk/window/utils"),
{ Cc, Ci, Cr } = require("chrome"),
cookieManager = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager2);
pattern = /^https?:\/\/navalny.livejournal.com\/.*/;

exports.main = function() {
  events.on('http-on-modify-request', listener);
};

exports.onUnload = function (reason) {
  events.off('http-on-modify-request', listener);
};

function listener(event) {
  var channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
  var url = event.subject.URI.spec;
  if (pattern.test(url)) {
    var gBrowser = utils.getMostRecentBrowserWindow().gBrowser,
    domWin = channel.notificationCallbacks.getInterface(Ci.nsIDOMWindow),
    browser = gBrowser.getBrowserForDocument(domWin.top.document),
    cookiemirror;
    channel.cancel(Cr.NS_BINDING_ABORTED);
    for (var e = cookieManager.getCookiesFromHost('api.navalny.us'); e.hasMoreElements();) {
      cookie = e.getNext().QueryInterface(Ci.nsICookie2);
      if(cookie.name == 'mirror'){
        cookiemirror = cookie.value;
        break;
      }
    }
    if (cookiemirror) {
      browser.loadURI(url.replace(/https?:\/\/navalny.livejournal.com/i, 'http://' + cookiemirror));
    }
    else {
      Request({
        url: 'http://api.navalny.us',
        onComplete: function (response) {
          if (response.status === 200) {
            browser.loadURI(url.replace(/https?:\/\/navalny.livejournal.com/i, 'http://' + response.headers['Mirror-Url']));
          }
          else {
            var domain = '';
            var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';
            for (var i=0; i < 5; i++) {
              domain += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            browser.loadURI(url.replace(/https?:\/\/navalny.livejournal.com/i, 'http://' + domain + '.fuckrkn.me'));
          }
        }
      }).get();
    }
  }
}
