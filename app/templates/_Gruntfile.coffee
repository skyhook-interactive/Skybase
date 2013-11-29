'use strict'

module.exports = (grunt) ->

  # load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach grunt.loadNpmTasks

  grunt.initConfig
    watch:
      options:
        livereload: 5729,
      livereload:
        files: [
          'themes/<%= themeName %>/*.php',
          'themes/<%= themeName %>/**/*.js'
          'themes/<%= themeName %>/img/*.{png,jpg,webp,svg}'
        ]

  grunt.registerTask 'default', ['watch',]