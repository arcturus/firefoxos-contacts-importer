'use strict';

if (!window.google) {
  var google = {};
}

var global = {};
global.imported = 0;

google.ui = function ui() {

  var progressBar = document.querySelector('#import_progress progress');
  var progressText = document.querySelector('#import_progress span');

  var printContacts = function printContacts(contactsList) {
    var container = document.getElementById('contactsList');
    for (var i = 0; i < contactsList.length; i++) {
      var contact = contactsList[i];
      var li = document.createElement('li');
      var title = contact.name;
      var showingEmail = false;
      if (!title && contact.email) {
        title = contact.email[0].value;
        showingEmail = true;
      }
      var subtitle = '';
      if (contact.tel) {
        subtitle = contact.tel[0].value;
      }

      if (subtitle == '' && contact.email && !showingEmail) {
        subtitle = contact.email[0].value;
      }
      li.dataset['tag'] = i % 2 == 0 ? 'A' : 'B';
      li.dataset['state'] = 'tagged';
      var img = '<img/>';
      li.innerHTML = img + '<dl><dt>' + title + '</dt><dd>' + subtitle + '</dd></dl>';

      container.appendChild(li);
    }

    document.getElementById('progress').classList.add('hide');
    document.getElementById('contactsList').classList.remove('hide');
  };

  var showContactsParsed = function showContactsParsed(num) {
    document.getElementById('progress').classList.add('hide');

    document.querySelector('#import h2').innerHTML = num + ' contacts found!';
    var importButton = document.querySelector('#import button');
    importButton.disabled = num == 0 ? 'disabled' : false;

    document.getElementById('import').classList.remove('hide');
  };

  var showImporting = function showImporting() {
    document.getElementById('import').classList.add('hide');
    document.getElementById('import_progress').classList.remove('hide');

    setTimeout(google.ui.updateStatus, 1000);
  };

  var finishImporting = function hideImporting() {
    document.getElementById('import_progress').classList.add('hide');
    document.getElementById('importer-finish').classList.remove('hide');
  };

  var updateStatus = function updateStatus() {
    var total = google.contacts.getContacts().length;
    var imported = global.imported;
    var percentage = parseInt(Math.floor(imported * 100 / total));

    progressText.innerHTML = percentage + ' %';
    progressBar.value = percentage;

    if (percentage != 100) {
      setTimeout(updateStatus, 1000);
    } else {
      setTimeout(finishImporting, 1000);
    }

  };

  return {
    'showContactsParsed': showContactsParsed,
    'showImporting': showImporting,
    'updateStatus': updateStatus,
    'finishImporting': finishImporting
  };

}();

google.auth = function auth() {
  var accessToken;

  var getURL = function getURL(url, success, error) {
    var request = new XMLHttpRequest();
    var theUrl = googleUrl(url);

    request.open('GET', theUrl, true);
    request.setRequestHeader('Authorization', 'OAuth ' + accessToken);
    request.setRequestHeader('Gdata-version', '3.0');
    request.withCredentials = 'true';
    request.onload = function loaded() {
      success(request.responseXML);
    };

    request.onerror = error;

    request.send();
  };

  var init = function init(at) {
    accessToken = at;
  };

  var getAccessToken = function getAccessToken() {
    return accessToken;
  };

  var googleUrl = function googleUrl(url) {
    if (!accessToken) {
      return url;
    }

    var theUrl = url;
    if (theUrl.indexOf('?') == -1) {
      theUrl += '?';
    } else {
      theUrl += '&';
    }
    theUrl += 'access_token=' + encodeURIComponent(accessToken);

    return theUrl;
  };

  return {
    'init': init,
    'getAccessToken': getAccessToken,
    'googleUrl': googleUrl
  };
}();

google.contacts = function contacts() {

  var contacts = [];
  var contactsToImport = [];
  var GOOGLE_URL = 'https://www.google.com/m8/feeds/contacts/default/full?max-results=10000';
  var GD_NAMESPACE = 'http://schemas.google.com/g/2005';
  var CATEGORY = 'gmail';
  var URN_IDENTIFIER = 'urn:service:gmail:uid:';

  var fetchContacts = function getContacts() {
    var url = GOOGLE_URL;

    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Authorization', 'OAuth ' + google.auth.getAccessToken());
    xhr.setRequestHeader('Gdata-version', '3.0');
    xhr.addEventListener('load', function dataLoaded(e) {
      if (xhr.status == 200 || xhr.status == 0) {
        parseContacts(xhr.responseXML);
        google.ui.showContactsParsed(contacts.length);
      } else {
        // TODO : Handle error
      }
    });
    xhr.send(null);
  };

  var parseContacts = function parseContacts(responseXML) {
    var contactsEntries = responseXML.querySelectorAll('entry');
    for (var i = 0; i < contactsEntries.length; i++) {
      var entry = contactsEntries[i];
      contacts.push(gContactToJson(entry));
    }
  };

  var getValueForNode = function getValueForNode(doc, name, def) {
    var defaultValue = def || '';

    if (doc == null || name == null) {
      return defaultValue;
    }

    var node = doc.querySelector(name);

    if (node && node.textContent) {
      return node.textContent;
    }

    return defaultValue;
  };

  var gContactToJson = function gContactToJson(googleContact) {
    var output = {};

    // This field will be needed for indexing within the
    // import process, not for the api
    output.uid = getUid(googleContact);

    output.name = getValueForNode(googleContact, 'title');

    // Store the photo url, not in the contact itself
    var photoUrl = googleContact.querySelector('link[type="image/*"]');
    if (photoUrl) {
      photoUrl = photoUrl.getAttribute('href');
    } else {
      // No image link
      photoUrl = '';
    }

    var name = googleContact.querySelector('name');
    if (name) {
      var contactName = getValueForNode(name, 'givenName');
      if (contactName) {
        output.givenName = [contactName];
      }
      var contactFamilyName = getValueForNode(name, 'familyName');
      if (contactFamilyName) {
        output.familyName = [contactFamilyName];
      }
      var contactSuffix = getValueForNode(name, 'additionalName');
      if (contactSuffix) {
        output.additionalName = [contactSuffix];
      }
    }

    output.email = parseEmails(googleContact);

    output.adr = parseAddress(googleContact);

    output.tel = parsePhones(googleContact);

    var org = googleContact.querySelector('organization');
    if (org) {
      output.org = [getValueForNode(org, 'orgName')];
      output.jobTitle = [getValueForNode(org, 'orgTitle')];
    }

    var bday = googleContact.querySelector('birthday');
    if (bday) {
      output.bday = new Date(bday.getAttribute('when'));
    }

    var content = googleContact.querySelector('content');
    if (content) {
      output.note = [content.textContent];
    }

    output.category = [CATEGORY];
    output.url = [{
      type: ['source'],
      value: getContactURI(output)
    }];

    return output;
  };

  var getContactURI = function getContactURI(contact) {
    return URN_IDENTIFIER + contact.uid;
  };

  // This will be a full url like:
  // http://www.google.com/m8/feeds/contacts/<email>/base/<contact_id>
  // for a specific contact node
  var getUid = function getUid(contact) {
    return contact.querySelector('id').textContent;
  };

  // Returns an array with the possible emails found in a contact
  // as a ContactField format
  var parseEmails = function parseEmails(googleContact) {
    var DEFAULT_EMAIL_TYPE = 'personal';
    var emails = [];
    var fields = googleContact.getElementsByTagNameNS(GD_NAMESPACE,
      'email');
    if (fields && fields.length > 0) {
      for (var i = 0; i < fields.length; i++) {
        var emailField = fields.item(i);

        // Type format: rel="http://schemas.google.com/g/2005#home"
        var type = emailField.getAttribute('rel') || DEFAULT_EMAIL_TYPE;
        if (type.indexOf('#') > -1) {
          type = type.substr(type.indexOf('#') + 1);
        }

        emails.push({
          'type': type,
          'value': emailField.getAttribute('address')
        });
      }
    }

    return emails;
  };

  // Given a google contact returns an array of ContactAddress
  var parseAddress = function parseAddress(googleContact) {
    var addresses = [];
    var fields = googleContact.getElementsByTagNameNS(GD_NAMESPACE,
      'structuredPostalAddress');
    if (fields && fields.length > 0) {
      for (var i = 0; i < fields.length; i++) {
        var field = fields.item(i);
        var address = {};

        address.streetAddress = getValueForNode(field, 'street');
        address.locality = getValueForNode(field, 'city');
        address.region = getValueForNode(field, 'region');
        address.postalCode = getValueForNode(field, 'postcode');
        address.countryName = getValueForNode(field, 'country');

        addresses.push(address);
      }
    }
    return addresses;
  };

  // Given a google contact this function returns an array of
  // ContactField with the pones stored for that contact
  var parsePhones = function parsePhones(googleContact) {
    var DEFAULT_PHONE_TYPE = 'personal';
    var phones = [];
    var fields = googleContact.getElementsByTagNameNS(GD_NAMESPACE,
      'phoneNumber');
    if (fields && fields.length > 0) {
      for (var i = 0; i < fields.length; i++) {
        var field = fields.item(i);

        // Type format: rel="http://schemas.google.com/g/2005#home"
        var type = field.getAttribute('rel') || DEFAULT_PHONE_TYPE;
        if (type.indexOf('#') > -1) {
          type = type.substr(type.indexOf('#') + 1);
        }

        phones.push({
          'type': type,
          'value': field.textContent
        });
      }
    }

    return phones;
  };

  var importContacts = function importContacts() {
    google.ui.showImporting();

    var contactsSaver = new ContactsSaver(contacts);
    contactsSaver.start();
    var self = this;

    contactsSaver.onsaved = function(c) {
      global.imported++;
    };
    contactsSaver.onerror = function(c, e) {
      global.imported++;
      console.log('Error importing ' + e);
    };
  };

  // All contacts
  var getContacts = function getContacts() {
    return contacts;
  };

  return {
    'parseContacts': parseContacts,
    'fetchContacts': fetchContacts,
    'importContacts': importContacts,
    'getContacts': getContacts
  };
}();

/* Based on the UI tests */
function ContactsSaver(data) {
  this.data = data;
  var next = 0;
  var self = this;

  this.start = function() {
    saveContact(data[0]);
  };

  function saveContact(cdata) {
    var contact = new mozContact();
    contact.init(cdata);
    var req = navigator.mozContacts.save(contact);
    req.onsuccess = function(e) {
      if (typeof self.onsaved === 'function') {
        self.onsaved(contact);
      }
      continuee();
    };

    req.onerror = function(e) {
      if (typeof self.onerror === 'function') {
        self.onerror(self.data[next], e.target.error);
      }
    };
  }

  function continuee() {
    next++;
    if (next < self.data.length) {
      saveContact(self.data[next]);
    }
    else {
      // End has been reached
      if (typeof self.onsuccess === 'function') {
        self.onsuccess();
      }
    }
  }
}
