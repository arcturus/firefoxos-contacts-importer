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
    document.getElementById('importWithPhone').classList.remove('hide');
  }

  var showImporting = function showImporting() {
    document.getElementById('import').classList.add('hide');
    document.getElementById('importWithPhone').classList.add('hide');
    document.getElementById('import_progress').classList.remove('hide');

    setTimeout(google.ui.updateStatus, 1000);
  };

  var updateStatus = function updateStatus() {
    var total = google.contacts.getContactsToImport().length;
    var imported = global.imported;
    var percentage = Math.floor(imported * 100 / total);

    progressText.innerHTML = percentage + ' %';
    progressBar.value = percentage;

    if (percentage != 100) {
      setTimeout(updateStatus, 1000);
    } else {
      document.querySelector('#import_progress button').classList.remove('hide');
    }

  };

  var showImportedContacts = function showImportedContacts() {
    document.getElementById('import_progress').classList.add('hide');
    printContacts(google.contacts.getContactsToImport());
    document.getElementById('contactsList').classList.remove('hide');
  };

  return {
    'showContactsParsed': showContactsParsed,
    'showImporting': showImporting,
    'updateStatus': updateStatus,
    'showImportedContacts': showImportedContacts
  };

}();

google.auth = function auth() {
  var accessToken;

  var getURL = function getURL(url, success, error) {
    var request = new XMLHttpRequest();
    var theUrl = googleUrl(url);

    request.open('GET', theUrl, true);
    request.setRequestHeader('Authorization', 'Bearer ' + accessToken);
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
  }

  return {
    'init': init,
    'getAccessToken': getAccessToken,
    'googleUrl': googleUrl
  }
}();

google.contacts = function contacts() {

  var contacts = [];
  var contactsToImport = [];
  var GOOGLE_URL = 'https://www.google.com/m8/feeds/contacts/default/full?access_token=%ACCESS_TOKEN%&start-index=1&max-results=10000';

  var fetchContacts = function getContacts() {
    var url = GOOGLE_URL.replace('%ACCESS_TOKEN%', google.auth.getAccessToken());
    console.log(url);

    var xhr = new XMLHttpRequest({mozAnon: true, mozSystem: true});
    xhr.open('GET', url, true);
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
      var contact = {};
      var name = entry.querySelector('title');
      var phoneNumber = entry.querySelector('phoneNumber');
      var email = entry.querySelector('email');
      var company = entry.querySelector('orgName');

      if (name) {
        parseName(name.textContent, contact);
      }
      if (phoneNumber) {
        parsePhoneNumber(phoneNumber.textContent, contact);
      }
      if (email) {
        parseEmail(email.getAttribute('address'), contact);
      }
      if (company) {
        parseOrg(company.textContent, contact);
      }

      contacts.push(contact);

    }

  };

  var parseName = function parseName(name, contact) {
    contact.name = [name];
    var nameParts = name.split(' ');
    if (nameParts.length == 1) {
      contact.givenName = nameParts;
    } else if (nameParts.length == 2) {
      contact.givenName = [nameParts[0]];
      contact.familyName = [nameParts[1]];
    } else {
      contact.givenName = [nameParts[0]];
      contact.additionalName = [nameParts[1]];
      contact.familyName = [nameParts.slice(2).join(' ')];
    }
  };

  var parsePhoneNumber = function parsePhoneNumber(rawPhone, contact) {
    var phones = Array.isArray(rawPhone) ? rawPhone : [rawPhone];

    contact.tel = [];
    for(var i = 0; i < phones.length; i++) {
      var originalPhone = phones[i];
      var phone = {
        'value': originalPhone,
        'carrier': null,
        'type': 'mobile' //Add a default value :(
      };
      contact.tel.push(phone);
    }
  };

  var parseEmail = function parseEmail(rawEmail, contact) {
    var emails = Array.isArray(rawEmail) ? rawEmail : [rawEmail];

    contact.email = [];
    for(var i = 0; i < emails.length; i++) {
      var originalEmail = emails[i];
      var email = {
        'value': originalEmail,
        'type': 'personal' // Default value
      }
      contact.email.push(email);
    }
  };

  var parseOrg = function parseOrg(rawOrg, contact) {
    var orgs = Array.isArray(rawOrg) ? rawOrg : [rawOrg];

    contact.org = [];
    for(var i = 0; i < orgs.length; i++) {
      contact.org.push(orgs[i]);
    }
  }

  var importContacts = function importContacts(onlyWithPhone) {
    google.ui.showImporting();

    contactsToImport = contacts;
    if (onlyWithPhone) {
      contactsToImport = [];
      contacts.forEach(function onlyWithPhone(contact) {
        if (contact.hasOwnProperty('tel') && contact.tel.length > 0) {
          contactsToImport.push(contact);
        }
      })
    }
    console.log('I\'ve got ' + contactsToImport.length + ' contacts to import');

    var contactsSaver = new ContactsSaver(contactsToImport);
    contactsSaver.start();
    var self = this;
    contactsSaver.onsaved = function(c) {
      global.imported++;
    };
    contactsSaver.onerror = function(c, e) {
      global.imported++;
      console.log('Error importing ' + e);
    }
  };

  // All contacts
  var getContacts = function getContacts() {
    return contacts;
  }

  // Just the subset to be imported
  var getContactsToImport = function getContactsToImport() {
    return contactsToImport;
  }

  return {
    'parseContacts': parseContacts,
    'fetchContacts': fetchContacts,
    'importContacts': importContacts,
    'getContacts': getContacts,
    'getContactsToImport': getContactsToImport
  }
}();

/* Based on the UI tests */
function ContactsSaver(data) {
  this.data = data;
  var next = 0;
  var self = this;

  this.start = function() {
    saveContact(data[0]);
  }

  function saveContact(cdata) {
    var contact = new mozContact();
    contact.init(cdata);
    var req = navigator.mozContacts.save(contact);
    req.onsuccess = function(e) {
      if (typeof self.onsaved === 'function') {
        self.onsaved(contact);
      }
      continuee();
    }

    req.onerror = function(e) {
      if (typeof self.onerror === 'function') {
        self.onerror(self.data[next], e.target.error);
      }
    }
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
