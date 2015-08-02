module.exports = function() {
    var root = './',
        src = root + 'src/',
        temp = root + '.tmp/',
        config = {
            root: root,
            src: src,
            temp: temp,
            prod: root + 'prod/',
            allScripts: [
                root + '*.js',
                src + '**/*.js'
            ],
            index: src + 'index.html',
            css: temp + 'styles/css/**/*.css',
            html: src + '**/*.html',
            fonts: src + 'fonts/**/*.*',
            images: src + 'images/**/*.*',
            scripts: src + '**/*.js',
            sass: src + 'styles/scss/**/*.{scss, sass}',
            bower: {
                json: require('./bower.json'),
                directory: root + 'bower_components/',
                ignorePath: '../..'
            },
            packages: [
                root + 'package.json',
                root + 'bower.json'
            ],
            reloadDelay: 0,
            port: 9000
        };

    return config;
};
