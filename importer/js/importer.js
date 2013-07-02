var googleAuth = 'https://accounts.google.com/o/oauth2/auth?scope=https://www.google.com/m8/feeds/&response_type=token&redirect_uri=http://redirector.cloudfoundry.com/redirect.html&approval_prompt=force&client_id=206115911344.apps.googleusercontent.com';
var authWindow;

var menu = document.getElementById('importer-menu');
var gContacts = document.getElementById('google-contacts');

document.getElementById('importGoogle').addEventListener(
  'click', function(evt) {
    var port = '';
    if (window.location.port != '') {
      port = ':' + window.location.port;
    }
    authWindow = window.open(googleAuth);
    window.addEventListener('message', function onMessage(evt) {
      authWindow.close();

      if (evt.data.error) {
        //Cancelled, we could show a message
        return;
      }

      menu.classList.add('hide');
      gContacts.classList.remove('hide');

      google.auth.init(evt.data.access_token);

      google.contacts.fetchContacts();
    });
});

document.getElementById('importButton').addEventListener('click', function(evt) { google.contacts.importContacts(); });
