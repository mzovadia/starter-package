var gulp = require('gulp');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var cssnano = require('gulp-cssnano');
var imagemin = require('gulp-imagemin');
var cache = require('gulp-cache');
var del = require('del');
var runSequence = require('run-sequence');
var htmlmin = require('gulp-htmlmin');
var extname = require('gulp-extname');
var assemble = require('assemble');
var app = assemble();
var styleguide = require('sc5-styleguide');
var outputPath = 'styleguide';

// Development Tasks 
// -----------------

gulp.task('load', function(cb) {
  app.src('app/templates/**/*.hbs');
  app.partials('app/templates/partials/*.hbs');
  app.layouts('app/templates/layouts/*.hbs');
  app.pages('app/templates/pages/**/*.hbs');
  cb();
});

gulp.task('assemble', ['load'], function() {
  return app.toStream('pages')
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(app.renderFile())
    .pipe(htmlmin())
    .pipe(extname())
    .pipe(plumber.stop())
    .pipe(app.dest('.tmp'));
});

//Start browserSync server
gulp.task('browserSync', function() {
  browserSync({
    injectChanges: true,
    server: {
      baseDir: '.tmp',
    }
  })
})


gulp.task('sass', function() {
  return gulp.src('app/scss/**/*.scss') // Gets all files ending with .scss in app/scss and children dirs
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(sourcemaps.init())
    .pipe(sass()) // Passes it through a gulp-sass
    .pipe(autoprefixer())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.tmp/css')) // Outputs it in the css folder
})

// Styleguide Tasks

gulp.task('styleguide:generate', function() {
  return gulp.src('app/scss/**/*.scss')
    .pipe(styleguide.generate({
      title: 'My Styleguide',
      port: 8080,
      server: {
        baseDir: 'styleguide'
      },
      rootPath: outputPath,
      overviewPath: 'README.md'
    }))
    .pipe(gulp.dest(outputPath));
});

gulp.task('styleguide:applystyles', function() {
  return gulp.src('app/scss/styles.scss')
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(styleguide.applyStyles())
    .pipe(gulp.dest(outputPath));
});

// Watchers
gulp.task('watch', ['styleguide'], function() {
  gulp.watch('app/scss/**/*.scss', ['sass', browserSync.reload]);
  gulp.watch(['app/scss/**/*.scss'], ['styleguide']);
  gulp.watch('.tmp/**/*.html', browserSync.reload);
  gulp.watch('app/templates/**/*.hbs', ['assemble']);
  gulp.watch('app/js/**/*.js', ['copy-js', browserSync.reload]);
})

// gulp.task('watch', ['styleguide'], function() {
//   // Start watching changes and update style guide whenever changes are detected
//   // Style guide automatically detects existing server instance
//   gulp.watch(['app/scss/**/*.scss'], ['styleguide']);
// });


// Optimization Tasks 
// ------------------

// Optimizing CSS and JavaScript 
gulp.task('useref', function() {
  return gulp.src(['.tmp/**/*.html'])
    .pipe(plumber({
      errorHandler: notify.onError('Error: <%= error.message %>')
    }))
    .pipe(useref())
    .pipe(gulpIf('*.js', uglify()))
    .pipe(gulpIf('*.css', cssnano()))
    .pipe(plumber.stop())
    .pipe(gulp.dest('dist'));
});

// Optimizing Images 
gulp.task('images', function() {
  return gulp.src('app/images/**/*.+(png|jpg|jpeg|gif|svg)')
    // Caching images that ran through imagemin
    .pipe(cache(imagemin({
      interlaced: true,
    })))
    .pipe(gulp.dest('dist/images'))
});

// Copying images to .tmp
gulp.task('copy-img', function() {
  return gulp.src('app/images/**/*')
    .pipe(gulp.dest('.tmp/images'))
})

// Copying fonts 
gulp.task('fonts', function() {
  return gulp.src('app/fonts/**/*')
    .pipe(gulp.dest('dist/fonts'))
})

// Copying fonts to .tmp
gulp.task('copy-fonts', function() {
  return gulp.src('app/fonts/**/*')
    .pipe(gulp.dest('.tmp/fonts'))
})

// Copying js to .tmp 
gulp.task('copy-js', function() {
  return gulp.src('app/js/**/*')
    .pipe(gulp.dest('.tmp/js'))
})

// Cleaning 
gulp.task('clean', function() {
  return del.sync('dist').then(function(cb) {
    return cache.clearAll(cb);
  });
})

gulp.task('clean:dist', function() {
  return del.sync(['dist/**/*', '!dist/images', '!dist/images/**/*']);
});

// Build Sequences
// ---------------

gulp.task('default', function(callback) {
  runSequence(['assemble', 'sass', 'copy-js', 'browserSync', 'watch'],
    callback
  )
})

gulp.task('assets', function(callback) {
  runSequence(['copy-fonts', 'copy-img'],
    callback
  )
})

gulp.task('build', function(callback) {
  runSequence(
    'clean:dist', ['assemble', 'sass', 'images', 'fonts'], 'useref',
    callback
  )
})


gulp.task('styleguide', ['styleguide:generate', 'styleguide:applystyles']);
