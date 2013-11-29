'use strict';

var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');

var fs = require('fs'),
  https = require('https'),
  exec   = require('child_process').exec,
  version,
  install,

var Skybase = module.exports = function Skybase(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  this.on('end', function () {
    this.installDependencies({ skipInstall: options['skip-install'] });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(Skybase, yeoman.generators.Base);

// get the latest stable version of Wordpress
Skybase.prototype.getVersion = function getVersion() {
  var cb = this.async();

  try {
    https.get('https://api.github.com/repos/WordPress/WordPress/tags', function (res) {
      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function () {
          var obj = JSON.parse(data);
          version = obj[0].name;
          cb();
        });
    }).on('error', function (e) {
        console.log('Got error: ' + e.message);
        cb();
      });
  }
  catch (e) {
    console.log('Something went wrong!!');
    cb();
  }

};

Skybase.prototype.defaultConfig = function getConfig() {
  var cb   = this.async();

  this.latestVersion = version;
  this.defaultAuthorName = '';
  this.defaultAuthorURI = '';
  this.defaultTheme = 'https://github.com/roots/roots/';
  this.acfPlugin = 'https://github.com/elliotcondon/acf/';

  cb();
};

Skybase.prototype.askOptions = function askOptions() {
  var cb = this.async();

  var prompts = [{
      type: 'checkbox',
      name: 'features',
      message: 'What would you like to do?',
      choices: [
      {
        name: 'Install Skybase',
        value: 'wpInstall',
        checked: true
      },
      ]
    }];

  this.prompt(prompts, function (answers) {
    var features = answers.features;
    this.wpInstall = features.indexOf('wpInstall') !== -1;

    cb();
  }.bind(this));
};

Skybase.prototype.askFor = function askFor() {
  var cb = this.async();

  var prompts = [{
      type: 'input',
      name: 'wordpressVersion',
      message: 'Which version of WordPress do you want?',
      default: this.latestVersion
    },
    {
      type: 'input',
      name: 'themeName',
      message: 'Name of your theme: ',
      default: 'skybase'
    },
    {
      type: 'input',
      name: 'themeBoilerplate',
      message: 'Starter theme (please provide a github link): ',
      default: this.defaultTheme
    },
    {
      type: 'confirm',
      name: 'installACF',
      message: 'Install Advanced Custom Fields?',
      default: true
    },
    {
      name: 'dbName',
      message: 'Database name:',
      default: ''
    },
    {
      name: 'dbUser',
      message: 'Database user:',
      default: ''
    },
    {
      name: 'dbPass',
      message: 'Database password:',
      default: ''
    }];

  this.prompt(prompts, function (props) {
    this.wordpressVersion = props.wordpressVersion;

    this.themeName = props.themeName;
    this.themeBoilerplate = props.themeBoilerplate;

    this.dbName = props.dbName;
    this.dbUser = props.dbUser;
    this.dbPass = props.dbPass;

    cb();
  }.bind(this));
};

// download the framework and unzip it in the project app/
Skybase.prototype.createApp = function createApp() {
  var cb   = this.async();

  this.log.writeln('Downloading Wordpress ' + this.wordpressVersion);
  this.tarball('https://github.com/WordPress/WordPress/tarball/' + this.wordpressVersion, '.', cb);
};

// remove the basic theme and create a new one
Skybase.prototype.createTheme = function createTheme() {
  var cb   = this.async();
  var self = this;

  this.log.writeln('First let\'s remove the built-in themes we will not use');
  // remove the existing themes
  fs.readdir('wp-content/themes', function (err, files) {
    if (typeof files !== 'undefined' && files.length !== 0) {
      files.forEach(function (file) {
        var pathFile = fs.realpathSync('wp-content/themes/' + file),
          isDirectory = fs.statSync(pathFile).isDirectory();

        if (isDirectory) {
          rimraf.sync(pathFile);
          self.log.writeln('Removing ' + pathFile);
        }
      });
    }
  });
  this.log.writeln('');
  this.log.writeln('Now we download the theme');

  // check if the user only gave the repo url or the entire url with /tarball/{branch}
  var tarballLink = (/[.]*tarball\/[.]*/).test(this.themeBoilerplate);
  if (!tarballLink) {
    // if the user gave the repo url we add the end of the url. we assume he wants the master branch
    var lastChar = this.themeBoilerplate.substring(this.themeBoilerplate.length - 1);
    if (lastChar === '/') {
      this.themeBoilerplate = this.themeBoilerplate + 'tarball/master';
    }
    else {
      this.themeBoilerplate = this.themeBoilerplate + '/tarball/master';
    }
  }

  // create the theme
  this.tarball(this.themeBoilerplate, 'wp-content/themes/' + this.themeName, cb);

};

Skybase.prototype.installPlugins = function installPlugins() {
	var cb   = this.async();

	if(this.installACF){
		this.tarball(this.acfPlugin, 'wp-content/plugins/', cb);
	}
}

Skybase.prototype.app = function app() {
  this.copy('index.php', 'index.php');
  this.template('_wp-config.php', 'wp-config.php');
  this.template('_Gruntfile.coffee', 'Gruntfile.coffee');
};

Skybase.prototype.projectfiles = function projectfiles() {
  this.copy('_package.json', 'package.json');
  this.copy('editorconfig', '.editorconfig');
  this.copy('jshintrc', '.jshintrc');
};

Skybase.prototype.installCore = function installCore() {
  var cb = this.async();

  if (this.wpInstall) {
    this.log.writeln('');
    this.log.writeln('Installing WordPress');
    install = exec('wp core install --path="core" --admin_user="admin" --admin_password="1" --admin_email=" " --title=' + this.themeName, function (error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
      }
      console.log(stdout);
      console.log(stderr);
      cb();
    });
  }
};
