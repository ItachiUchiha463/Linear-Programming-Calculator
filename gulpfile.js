const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const ts = require('gulp-typescript');
const concat = require('gulp-concat');
const tsProject = ts.createProject('tsconfig.json');

const paths = {
    styles: {
        src: 'scss/**/*.scss', // Твоя папка зі стилями
        dest: 'dist/css/'
    },
    scripts: {
        src: 'ts/**/*.ts',    // Твоя папка з TypeScript файлами
        dest: 'dist/js/'
    },
    html: {
        src: 'html/**/*.html' // Твоя папка з HTML (якщо index.html там)
    }
};

function styles() {
    return gulp.src(paths.styles.src)
        .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
        .pipe(autoprefixer({ cascade: false }))
        .pipe(gulp.dest(paths.styles.dest))
        .pipe(browserSync.stream());
}

function scripts() {
    return gulp.src([
        'ts/Fraction.ts',
        'ts/Interfaces.ts',
        'ts/BaseSimplexSolver.ts',
        'ts/GraphicalSolver.ts',
        'ts/ArtificialBasisSolver.ts',
        'ts/SimplexSolver.ts',
        'ts/DualSimplexSolver.ts',
        'ts/GomorySolver.ts',
        'ts/TransportationSolver.ts',
        'ts/ResultRenderer.ts',
        'ts/AppController.ts'
    ], { allowEmpty: true })
        .pipe(tsProject())
        .js
        .pipe(concat('script.js'))
        .pipe(gulp.dest('dist/js/'))
        .pipe(browserSync.stream());
}
function serve() {
    browserSync.init({
        server: {
            baseDir: "./", // Сервер дивиться в корінь проекту
            routes: {
                "/": "html" // Якщо index.html в папці html, браузер відкриє її як головну
            }
        }
    });

    gulp.watch(paths.styles.src, styles);
    gulp.watch(paths.scripts.src, scripts);
    gulp.watch(paths.html.src).on('change', browserSync.reload);
}

const build = gulp.series(gulp.parallel(styles, scripts));
const watch = gulp.series(build, serve);

exports.styles = styles;
exports.scripts = scripts;
exports.build = build;
exports.default = watch;