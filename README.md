firefoxos-contacts-importer
===========================

Import your contacts from different sources to Firefox OS.

# How to make it work

The contacts API in FirefoxOS requires some privileges to work, as well any app that uses it.
You can check the permissions matrix ('https://docs.google.com/spreadsheet/ccc?key=0Akyz_Bqjgf5pdENVekxYRjBTX0dCXzItMnRyUU1RQ0E#gid=0')
So far, I'm not able to create a priviledge app, so it's a _certified_ one, which means you'll
need to build and flash a gaia version that contains this app.

# Import contacts from Google

Using the google contacts API will retrieve all the contacts stored on Google Contacts.
Two ways of importing, all the info stored and also it provides the ability to import
contacts that have a phone number.
This last option is recommended as long as you will have contacts just with email
address and so on.

This application WON'T modify your contacts in Google Contacts, as well as other contacts
that you may have already saved on your Firefox OS contacts list.
