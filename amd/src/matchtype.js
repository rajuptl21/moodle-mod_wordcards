/**
 * Matching module.
 *
 * @package mod_wordcards
 * @author  Justin Hunt - poodll.com
 * * (based on Paul Raine's APPs 4 EFL)
 */

define([
  'jquery',
  'core/ajax',
  'core/log',
  'mod_wordcards/a4e',
  'mod_wordcards/keyboard',
  'core/templates'
], function($, Ajax, log, a4e, keyboard, templates) {

  var app = {
    dryRun: false,
    init: function(props) {

      //pick up opts from html
      var theid = '#' + props.widgetid;
      this.dryRun = props.dryRun;
      this.nexturl = props.nexturl;
      var configcontrol = $(theid).get(0);
      if (configcontrol) {
        var matchingdata = JSON.parse(configcontrol.value);
        $(theid).remove();
      } else {
        //if there is no config we might as well give up
        log.debug('No config found on page. Giving up.');
        return;
      }

      app.process(matchingdata);

      a4e.register_events();
      a4e.init_audio(props.token,props.region,props.owner);

      this.register_events();
    },

    register_events: function() {

      $('body').on('click', "#close-results", function() {

        var total_time = app.timer.count;
        var url = app.nexturl.replace(/&amp;/g, '&') + "&localscattertime=" + total_time
        window.location.replace(url);

      });

      $('body').on('click', "#try-again", function() {
        location.reload();
      });

      $('body').on('click', '#start-button', function() {
        app.start();
      });

    },

    process: function(json) {

      app.terms = json.terms;
      app.has_images = json.has_images;
      a4e.list_vocab("#vocab-list-inner", app.terms);

    },
    start: function() {
      app.results = [];
      a4e.shuffle(app.terms);
      app.pointer = 0;
      $("#vocab-list, #start-button").hide();
      $("#gameboard").show();
      $("#time-counter").text("00:00");
      app.timer = {
        interval: setInterval(function() {
          app.timer.update();
        }, 1000),
        count: 0,
        update: function() {
          app.timer.count++;
          $("#time-counter").text(a4e.pretty_print_secs(app.timer.count));
        }
      };
      app.next();
    },
    quit: function() {
      keyboard.clear();
      clearInterval(app.timer.interval);
      $("#gameboard").hide();
      $("#vocab-list, #start-button").show();
    },

    end: function() {
      keyboard.clear();
      clearInterval(app.timer.interval);
      $("#gameboard, #start-button").hide();
      $("#results").show();

      //template data
      var tdata = [];
      tdata['results'] = app.results;
      tdata['total'] = app.terms.length;
      tdata['totalcorrect'] = a4e.calc_total_points(app.results);
      var total_time = app.timer.count;
      if (total_time == 0) {
        tdata['prettytime'] = '00:00';
      } else {
        tdata['prettytime'] = a4e.pretty_print_secs(total_time);
      }
      templates.render('mod_wordcards/feedback', tdata).then(
        function(html, js) {
          $("#results-inner").html(html);
        }
      );

      var data = {
        results: app.results,
        activity: "match_type"
      };
      console.log(data);

    },

    next: function() {

      a4e.progress_dots(app.results, app.terms);
      
      $("#submitted").html("").removeClass("a4e-correct a4e-incorrect");

      keyboard.create("input", app.terms[app.pointer].term, app.pointer, true, function(value) {
        $("#submitted").html(app.terms[app.pointer].term);
        keyboard.disable();
        app.check(value);
      });

      var code="";
      if(app.terms[app.pointer].image){
        code+="<img class='a4e-prompt-img' src='" + app.terms[app.pointer].image + "'>";
      }
      code+="<strong>" + app.terms[app.pointer].definition + "</strong>"
      $("#question").html(code);

    },

    check: function(selected) {
      var correct = selected.toLowerCase().trim() == app.terms[app.pointer].term.toLowerCase().trim();
      var points = 0;
      if (correct == true) {
        //createjs.Sound.play('correct');
        $("#submitted").addClass("a4e-correct");
        points = 1;
      } else {
        $("#submitted").addClass("a4e-incorrect");
        //createjs.Sound.play('incorrect');
      }

      //post results to server
      if (correct) {
        this.reportSuccess(app.terms[app.pointer]['id']);
      } else {
        this.reportFailure(app.terms[app.pointer]['id'], 0);
      }

      var result = {
        question: app.terms[app.pointer]['definition'],
        selected: selected,
        correct: app.terms[app.pointer]['term'],
        points: points
      };
      
      app.results.push(result);

      if (app.pointer < app.terms.length - 1) {
        app.pointer++;

        setTimeout(function() {
          app.next();
        }, 1000)

      } else {
        app.end();
      }



    },

    reportFailure: function(term1id, term2id) {
      if (this.dryRun) {
        return;
      }

      Ajax.call([{
        methodname: 'mod_wordcards_report_failed_association',
        args: {
          term1id: term1id,
          term2id: term2id
        }
      }]);
    },

    reportSuccess: function(termid) {
      if (this.dryRun) {
        return;
      }

      Ajax.call([{
        methodname: 'mod_wordcards_report_successful_association',
        args: {
          termid: termid
        }
      }]);
    }
  };

  return app;

});