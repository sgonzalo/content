const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const moment = require('moment');
var colors = require('colors');
const POSSIBLE_STATUS = ['draft', 'published', 'unassigned'];

const walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

let slugs = [];
let names = [];
const buildLessons = (allLessons) => allLessons.map(l => {
  const fileName = l.replace(/^.*[\\\/]/, '').split('.').slice(0, -1).join('.').toLowerCase();
  names.push(fileName);
  return {
    path: l,
    fileName,
    originalSlug: fileName.replace('.es',''),
    content: fs.readFileSync(l, 'utf8')
  }
});

const validateLessons = (lesson) => lesson.map(({ content, fileName, originalSlug, path }) => {
    
    console.log("Validating: "+path);
    const { slug, title, date, tags, status, authors, subtitle } = fm(content).attributes;
    
    if(fileName.indexOf('.es') > -1){
      if(!names.includes(originalSlug)) throw new Error(`Lesson ${fileName} must have an english version ${originalSlug}`.red);
    } 
    
    if(!title) throw new Error('Missing lesson title'.red);
    
    if(!tags || !Array.isArray(tags) || tags.length == 0) throw new Error(`Lesson tags must be an array and have at least one tag`.red);
    if(authors && !Array.isArray(authors)) throw new Error(`Author property must be an array of strings (github usernames) of post authors`.red);
    if(status && !POSSIBLE_STATUS.includes(status)) throw new Error(`The lesson status must be one of ${POSSIBLE_STATUS.join(',')}`.red);
    if(!moment(date).isValid()) throw new Error(`Invalid lesson date: ${date}`.red);

    if(status=='published' || !status){
      if(!subtitle || subtitle == '' || subtitle.length < 50 || subtitle.length > 340) throw new Error(`The lesson must have a subtitle within 50 and 340 characters, ${subtitle.length} found`.red);
    }
    if(slug && slugs.includes(slug)) throw new Error(`Duplicated lesson slug: ${slug} in two or more lessons`.red);
    slugs.push(slug);
    
    return true;
});

walk('src/content/lesson', function(err, results) {
    if (err){
        console.log("Error scanning lesson files".red);
        process.exit(1);
    } 
    
    try{
        const result = validateLessons(buildLessons(results));
        console.log("Success!! All files are valid".green);
        process.exit(0);
    }
    catch(error){
        console.log(error);
        process.exit(1);
    }
});
