'use strict';

var exec = require('child_process').exec;
var defer = require('q').defer;

var fs      = require('fs');
var http    = require('https');
var AdmZip  = require('adm-zip');
var request = require('request');

/** The default path into which the python virtualenv will be installed */
var defaultEnvPath = __dirname + '/../env ';
var virtualEnvPath = __dirname + '/../.virtualenv';
var virtualZipFile = __dirname + '/../virtualenv.zip';
var pipInstallFile = __dirname + '/../get-pip.py';

var pipUrl = 'https://raw.githubusercontent.com/pypa/pip/master/contrib/get-pip.py';


/**
 * A method that grabs the get-pip.py file from github and uses it to install pip.
 * @returns {Q.promise}
 */
function installPip() {
  var deferrable = defer();

  request(pipUrl)
    .pipe(fs.createWriteStream(pipInstallFile))
    .on('error', function(error) {
        deferrable.reject(error);
    });

  executeScript(pipInstallFile).then(function(success){
    deferrable.resolve(success);
  }, function(error){
    deferrable.reject(error);
  });

  return deferrable.promise;
}

/**
 * A method that installs virtualenv from github
 * @returns {Q.promise}
 */
 function installVirtualEnv() {

  var deferrable = defer();
   var zipURL = '';

   var options = {
     url: 'https://api.github.com/repos/pypa/virtualenv/tags',
     headers: {
       'User-Agent': 'node-python-virtualenv'
     }
   }

  fs.lstat(virtualEnvPath, function(err, stats) {

      // virtualenv not installed
      if (err) {

         // Find latest tagged release
         request(options, function(error, response, body) {

           if (!error && response.statusCode == 200)
             options.url = JSON.parse(body)[0].zipball_url;
           else
             deferrable.reject(error);

           // Download and extract virtualenv zip file
           request(options)
            .pipe(fs.createWriteStream(virtualZipFile))
            .on('close', function() {
                var zip = new AdmZip(virtualZipFile);
                zip.extractAllTo(virtualEnvPath, true);
                deferrable.resolve();
            })
            .on('error', function(error) {
              deferrable.reject(error);
            });

         });

      } else {
        deferrable.resolve();
      }

    });

   return deferrable.promise;
 }

/**
 * A common method to execute a shell command. The execution is wrapped in a promise that will be
 * rejected with the output of stderr if the execution fails. Otherwise the promise resolves
 *
 * @param {string} command
 *   The shell command to execute.
 * @param {object=} options
 *   Additional options, see `child_process.exec`.
 * @returns {Q.promise}
 */
function executeCommand(command, options) {
  var deferrable = defer();

  exec(command, options, function (error, stdout) {
    if (error) {
      deferrable.reject(error);
    } else {
      deferrable.resolve(stdout);
    }
  });

  return deferrable.promise;
}

/**
 * Finds out the python version of the system-wide python.
 *
 * @returns {Q.promise}
 */
function systemInterpreterVersion() {
  return executeCommand('python --systemInterpreterVersion').then(function(stdout){
    return stdout.trim().substr(7);
  });
}


/**
 * Installs the virtualenv. It also installs pip, so it is really easy to installEnv additional python
 * packages.
 *
 * If you don't want to installEnv it
 *
 * @returns {Q.promise}
 */
function installEnv(envPath) {

  return installVirtualEnv().then(function() {

    var virtPath = virtualEnvPath + '/' + fs.readdirSync(virtualEnvPath)[0];
    var command = [
      // Execute the virtualenv-script
      'python ', virtPath, '/virtualenv.py ',
      // Into the target or default target
      envPath || defaultEnvPath,
      // And don't installEnv setuptools/pip, this will not work.
      '--no-setuptools'
    ];

    return executeCommand(command.join('')).then(function(){
      return installPip().then(function(success) {
        return success;
      }, function(failure) {
        return failure;
      });
    });

  });

}


/**
 * Installs the python package identified by the given string. The string is passed to pip, see
 * http://www.pip-installer.org/en/latest/reference/pip_install.html for detailed information.
 *
 * If you want to use another virtualenv than the default virtualenv or if you did not installEnv
 * the virtualenv in the default directory, you can pass in the path to the virtualenv as the second
 * parameter.
 *
 * @param {string} packageName
 * @param {string=} envPath
 *
 */
function installPackage(packageName, envPath) {
  return executeBin('pip install ' + packageName, envPath);
}


/**
 * Executes the python script with the given path in the installed virtualenv. If you want to use
 * another virtualenv than the default virtualenv or if you did not installEnv the virtualenv in the
 * default directory, you can pass in the path to the virtualenv as the second parameter.
 *
 * Please note that this function does not validate the input and you could execute malicious
 * commands in the shell.
 *
 * @param {string} scriptPath
 * @param {object=} options
 * @param {string=} pythonEnv
 * @returns {Q.promise}
 */
function executeScript(scriptPath, options, pythonEnv) {
  return executeCommand((pythonEnv || defaultEnvPath) + 'bin/python ' + scriptPath, options);
}


/**
 * Executes the installed package script. If you want to use another virtualenv than the default
 * virtualenv or if you did not installEnv the virtualenv in the default directory, you can pass in
 * the path to the virtualenv as the second parameter.
 *
 * Please note that this function does not validate the input and you could execute malicious
 * commands in the shell.
 *
 * @param {string} bin
 * @param {object=} options
 * @param {string=} pythonEnv
 * @returns {Q.promise}
 */
function executeBin(bin, options, pythonEnv) {
  return executeCommand((pythonEnv || defaultEnvPath) + 'bin/' + bin, options);
}


exports.systemInterpreterVersion = systemInterpreterVersion;
exports.installEnv = installEnv;
exports.executeBin = executeBin;
exports.executeScript = executeScript;
exports.installPackage = installPackage;
