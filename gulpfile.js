var gulp = require('gulp'),
	sass = require('gulp-sass');

var styles = {
	'source': [
		'./assets/styles/scss/**/*.scss'
	],
	'dest': './assets/styles/css'
}

// SASS
gulp.task('sass', function() {
	return gulp.src(styles.source)
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest(styles.dest));
});

// Watch
gulp.task('watch', function() {
	gulp.watch(styles.source, ['sass']);
});

// Build
gulp.task('default', ['sass']);

// Build then watch
gulp.task('dev', ['default', 'watch']);