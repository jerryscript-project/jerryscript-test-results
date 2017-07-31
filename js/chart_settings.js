var dataset = [];

function init_datepickers(first_date, last_date) {
  var picker_options = {
    dateFormat: 'yy-mm-dd',
    changeMonth: true,
    changeYear: true,
    numberOfMonths: 1
  },
  from = $('#chart-datepicker-from').datepicker(picker_options),
  to = $('#chart-datepicker-to').datepicker(picker_options);

  from.datepicker('option', 'minDate', first_date);
  from.datepicker('option', 'maxDate', last_date);
  to.datepicker('option', 'minDate', first_date);
  to.datepicker('option', 'maxDate', last_date);

  from.on('change', function() {
    to.datepicker('option', 'minDate', getDate(this));
    update_chart(getDate(this), getDate(to[0]));
  }).val(first_date);

  to.on('change', function() {
    from.datepicker('option', 'maxDate', getDate(this));
    update_chart(getDate(from[0]), getDate(this));
  }).val(last_date);

  function getDate(element) {
    var date;
    try {
      date = new Date(element.value);
    } catch (error) {
      date = null;
    }

    return date;
  }
}

function generate_chart(data, type) {
  var line_color = '#1f77b4';
  var type_key = 'bin.total';
  var label_name = 'binary size';

  if (type === 'memory') {
    line_color = '#ff7f0e';
    type_key = 'total_memory';
    label_name = 'total memory';
  }

  var chart = c3.generate({
    bindto: '#' + type + '-chart',
    size: {
      height: 220
    },
    data: {
      json: data,
      names: {
        [type_key] : label_name
      },
      keys: {
        x: 'date',
        value: [type_key],
      },
      onclick: function(d, element) {
        chart.unselect([type],[d.index]);
        window.open('https://github.com/jerryscript-project/jerryscript/commit/' + data[d.index].submodules.jerryscript.commit);
      },
      selection: {
        enabled: true,
        multiple: false
      }
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: {
          count: 10,
          fit: true,
          format: '%Y-%m-%d'
        }
      }
    },
    color: {
      pattern: [line_color]
    },
    tooltip: {
      contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
        var tt = '<table class="c3-tooltip">' +
        '<tbody>' +
          '<tr>' +
            '<th colspan="2">' + data[d[0].index].date + '</th>' +
          '</tr>' +
          '<tr class="c3-tooltip-name--binary">' +
            '<td class="name">' +
              '<span style="background-color: ' + color(d[0]) + '"></span>' +
              d[0].name +
            '</td>' +
            '<td class="value">' + ((d[0].value === null) ? 'N/A' : d[0].value) + '</td>' +
          '</tr>' +
          '<tr class="c3-tooltip-name--commit">' +
            '<td class="name">commit</td>' +
            '<td class="value">' + data[d[0].index].submodules.jerryscript.commit.substring(0, 7) + '</td>' +
          '</tr>' +
        '</tbody>' +
        '</table>';

        return tt;
      }
    }
  });
}

function iso_date(date) {
  return new Date(date).toISOString().substr(0, 10);
}

function fetch_chart_data(device) {
  dataset = [];

  if (!firebase.apps.length) {
    return;
  }

  var last_element = "";
  var first_element = "";

  g_db_ref.child(g_db_keys[g_db_keys.length - 1]).once('value').then(function(snapshot) {
    first_element = snapshot.val();
    g_db_ref.child(g_db_keys[0]).once('value').then(function(snapshot) {
      last_element = snapshot.val();

      init_datepickers(iso_date(first_element.date), iso_date(last_element.date));

      var start_date = new Date(last_element.date);
      start_date.setMonth(start_date.getMonth() - 2);
      if (start_date < new Date(first_element.date)) {
        start_date = new Date(first_element.date);
      }
      else {
        start_date = iso_date(start_date)
      }

      update_chart(start_date, last_element.date);

      $('#chart-datepicker-from').val(start_date);
    }, function(error) {
      console.error(error);
    });
  }, function(error) {
    console.error(error);
  });
}

function update_chart(from, to) {

  var slice = [];
  var d_to = new Date(to);
  d_to.setDate(d_to.getDate() + 1);
  g_db_ref.orderByChild('date').startAt(iso_date(from)).endAt(iso_date(d_to)).once("value", function(testcases) {
    testcases.forEach(function (testcase) {
      var data = testcase.val();
      data.date = iso_date(data.date);

      var tests = data.tests;
      var total_memory = 0;
      tests.forEach(function(testname) {
        if (testname.memory){
          if (!isNaN(testname.memory)) {
            total_memory += parseInt(testname.memory)
          }
        }
      });

      data.total_memory = total_memory;
      slice.push(data);
    });

    generate_chart(slice, 'binary');
    generate_chart(slice, 'memory');
  });
}

