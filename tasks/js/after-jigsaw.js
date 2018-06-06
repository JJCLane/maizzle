let fs = require('fs-extra');
let glob = require('glob-all');
let inlineCSS = require('juice');
let cheerio = require('cheerio');
let cleanCSS = require('email-remove-unused-css');
let pretty = require('pretty');
let minify = require('html-minifier').minify;
let sixHex = require('color-shorthand-hex-to-six-digit');
let altText = require('html-img-alt');

module.exports.processEmails = (config, build_path, env) => {

  let files = glob.sync([build_path+'/**/*.html']);
  let extraCss = fs.readFileSync('source/assets/css/extra.css', 'utf8');

  files.map((file) => {

    let html = fs.readFileSync(file, 'utf8');

    if (env !== 'local') {
      html = inlineCSS(html, {removeStyleTags: env == 'local' ? false : true});
    }

    let $ = cheerio.load(html, {decodeEntities: false});
    let style = $('style').first();
    style.html(extraCss + style.text());

    if (config.transforms.cleanup.removeTableWidthCss) {
      $('table, td').each((i, elem) => {
        $(elem).css('width', '');
      });
    }

    if (config.transforms.cleanup.preferBgColorAttribute) {
      $('[bgcolor]').each((i, elem) => {
        $(elem).css('background-color', '');
      });
    }

    html = $.html();

    if (config.transforms.cleanup.removeUnusedCss) {
      html = cleanCSS(html).result;
    }

    if (config.transforms.prettify && !config.transforms.minify.minifyHtml) {
      html = pretty(html, {ocd: true, indent_inner_html: false});
    }

    if (config.transforms.minify && config.transforms.minify.minifyHtml) {
      html = minify(html, {
        html5: false,
        maxLineLength: config.transforms.minify.maxLineLength || 500,
        keepClosingSlash: true,
        collapseWhitespace: true,
        removeEmptyAttributes: true,
        // preserveLineBreaks: true,
        includeAutoGeneratedTags: false,
        // processConditionalComments: true,
        minifyCSS: config.transforms.minify.minifyCss ? true : false
      });
    }

    html = sixHex(html);
    html = altText(html);

    fs.writeFileSync(file, html);

  });

}