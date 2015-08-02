var gulp        = require('gulp'),
    args        = require('yargs').argv,
    del         = require('del'),
    wiredep     = require('wiredep').stream,
    browserSync = require('browser-sync'),
    config      = require('./gulp.config.js')(),
    $           = require('gulp-load-plugins')({lazy: true}),
    port        = process.env.PORT || config.defaultPort;

gulp.task('lint', function () {
    log('Analyzing JS code with JSHint & JSCS');
    return gulp
        .src(config.allScripts)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {
            verbose: true
        }))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('clean', function(done) {
    var delConfig = [].concat(config.prod, config.temp);
    log('Cleaning ' + $.util.colors.grey(delConfig));
    del(delConfig, done);
});

gulp.task('clean:fonts', function(done) {
    clean(config.prod + 'fonts/**/*.*', done);
});

gulp.task('clean:images', function(done) {
    clean(config.prod + 'images/**/*.*', done);
});

gulp.task('clean:styles', function(done) {
    clean(config.temp + '**/*.css', done);
});

gulp.task('clean:code', function(done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.prod + '**/*.html',
        config.prod + 'scripts/**/*.js'
    );
    clean(files, done);
});

gulp.task('styles', gulp.series('clean:styles', function() {
    log('Compiling Sass ' + config.sass + ' to CSS ' + config.css);
    return gulp
        .src(config.sass)
        .pipe($.plumber())
        .pipe($.sass())
        .pipe($.autoprefixer({
            browsers: [
                'last 2 version',
                 '> 5%'
                 ]
        }))
    .pipe(gulp.dest(config.temp + 'styles/css/'));
}));

gulp.task('fonts', gulp.series('clean:fonts', function() {
    log('Copying fonts from ' + config.fonts);
    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.prod + 'fonts'));
}));

gulp.task('images', gulp.series('clean:images', function() {
    log('Copying & compressing images from ' + config.images);
    return gulp
        .src(config.images)
        .pipe($.imagemin({
            optimizationLevel: 4
        }))
        .pipe(gulp.dest(config.prod + 'images'));
}));

gulp.task('wiredep', function() {
    log('Bowering css & js into html');
    return gulp
        .src(config.index)
        .pipe(wiredep({
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        }))
        .pipe(gulp.dest(config.src));
});

gulp.task('inject', gulp.series(
    gulp.parallel('wiredep', 'styles'),
    function() {
        log('Injecting css & js into html');
        return gulp
            .src(config.index)
            .pipe($.inject(
                gulp.src([config.css, config.scripts]),
                {relative: true}
            ))
            .pipe(gulp.dest(config.src));
    })
);

gulp.task('optimize', gulp.series('inject', function() {
    var assets = $.useref.assets({
            searchPath: config.src
        }),
        jsFilter = $.filter(['**/*.js'], {restore: true}),
        cssFilter = $.filter(['**/*.css'], {restore: true});
    log('Optimizing js, css & html');
    return gulp
        .src(config.index)
        .pipe($.plumber())
        .pipe(assets)
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe(cssFilter.restore)
        .pipe(jsFilter)
        .pipe($.uglify())
        .pipe(jsFilter.restore)
        .pipe($.rev())
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.revReplace())
        .pipe(gulp.dest(config.prod))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.prod));
}));

/*
 * Bump the version
 * --type=pre will bump prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --ver=1.2.3 will bump to a specific version and ignore other flags
 */

gulp.task('bump', function() {
    var msg = 'Versioning ',
        type = args.type,
        version = args.ver,
        options = {};

    if (version) {
        options.version = version;
        msg += 'to ' + version;
    } else {
        options.type = type;
        msg += 'for a ' + type;
    }
    log(msg);
    return gulp
        .src(config.packages)
        .pipe($.bump(options))
        .pipe($.print())
        .pipe(gulp.dest(config.root));
});

gulp.task('serve', gulp.series('inject', function() {
    serve();
}));

gulp.task('serve:prod', gulp.series('optimize', function() {
    serve('prod');
}));

gulp.task('build', gulp.series(
    gulp.parallel('clean', 'optimize'),
    function() {
        log('Building application...');
    }
));

gulp.task('default', gulp.series('serve'));

function log(msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.gray(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.gray(msg));
    }
}

function clean(path, done) {
    log('Cleaning ' + $.util.colors.gray(path));
    del(path, done);
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.src + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function serve (mode) {

    var baseDir = [];

    if (args.nosync || browserSync.active) {
        return;
    }

    log('Starting browser sync on port ' + port);

    if (mode === 'prod') {
        baseDir = [config.prod];
    } else {
        baseDir = ['src'];
        gulp.watch(
                [config.sass, config.scripts, config.html],
                gulp.series('inject', function() {
                    browserSync.reload();
                })
            )
            .on('change', function(event) {
                changeEvent(event);
            });
    }

    browserSync({
        port: config.port,
        server: {
            baseDir: baseDir,
            routes: {
                '/.tmp': '.tmp',
                '/bower_components': 'bower_components'
            }
        },
        /* ghostMode: {
            click: true,
            location: false,
            forms: true,
            scroll: true
        }, */
        notify: false,
        reloadDelay: config.reloadDelay
    });
}
