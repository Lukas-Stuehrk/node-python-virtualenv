#!/usr/bin/env node

var done = false;

virtualenv = require('python-virtualenv');
virtualenv.installEnv().then(function(){
  virtualenv.installPackage('zope.interface').then(function(){
    done = true;
  }, function(error){
    console.log('error2', error);
  })
}, function(error){
  console.log(error);
});


function checkDone(){
  if (!done) {
    setTimeout(checkDone, 1000);
  }
}
checkDone();