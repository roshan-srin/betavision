$(document).ready(function() {
        
    //Initiates connection with server
    var socket = io.connect('http://' + document.domain + ':' + location.port);

    $('.popup').hide();
    $('#container2').hide();
    $('#selected').hide();
    $('#correlation').hide();

    //Function to display error messages
    var warning = function(msg) {
        if (msg != 'Error: xhr poll error') {
            $('#message').html(msg);
            $('#warning').css('display', 'block');
        };
    };

    socket.on('error', warning);

    $('#warning button').click(function(event) {
        $('#warning').css('display', 'none');
    });

    $('#instructions-popup').click(function(event) {
        event.preventDefault();
        $('#instructions').css('display', 'block');
    });

    $('#instructions i').click(function(event) {
        $('#instructions').css('display', 'none');
    });

    $('#correlation i').click(function(event) {
        $('#correlation').css('display', 'none');
    });

    //Event handler for uploading files
    $('#init').click(function(event) {
        socket.emit('create object');
    });

    //Once object created, change the page accordingly
    socket.on('object created', function(dict) {
        $('#container2').show();
        $('#before').hide();
        $('#reset').click();
        var msg = '<ul>';
        var names = dict['data'];
        for (var i = 0; i < names.length; i++) {
            msg += '<li>' + names[i] + '</li>';
        };
        msg += '</ul>';
        $('.files-list').html(msg);
    });

    //Event handler for selecting a file
    $('.files-list').click(function(event) {
        var $target = $(event.target);
        if ($target.hasClass('selected-file')) {
            $target.removeClass('selected-file');
            $(this).parent().next().find('.columns-list').html('<p class="before">Select a file from the left</p>');
        } else {
            $(this).find('.selected-file').removeClass('selected-file');
            $selected = $('.files-list').find('.selected-file');
            if ($selected.length > 0 && $selected.text() == $target.text()) {
                warning("Can't join the same file");
            } else {
                $target.addClass('selected-file');
                var name = $target.text();
                socket.emit('column names request', {data : name, position : $(this).parent().attr('class')});            
            };
        };   
    });

    //Display columns for when user selects a file
    socket.on('column names response', function(dict) {
        var msg = '<ul>';
        var cols = dict['data'];
        for (var i = 0; i < cols.length; i++) {
            msg += '<li>' + cols[i] + '</li>';
        };
        msg += '</ul>';
        $("." + dict['position']).last().children().html(msg);
    });

    //Event handler for selecting columns
    $('.columns-list').click(function(event) {
        var $target = $(event.target);
        if ($target.hasClass('selected-column')) {
            $target.removeClass('selected-column');
            $target.removeAttr('data-order');
            if ($(this).find('[data-order="two"]').length > 0) {
                $(this).find('[data-order="two"]').attr('data-order', 'one');
            };
        } else {
            if ($(this).find('.selected-column').length == 2) {
                warning('Can only join on at most two columns, please deselect a column');
            } else {
                $target.addClass('selected-column');
                if ($(this).find('[data-order="one"]').length == 0) {
                    $target.attr('data-order', 'one');
                } else if ($(this).find('[data-order="two"]').length > 0) {
                    $(this).find('[data-order="two"]').attr('data-order', 'one')
                    $target.attr('data-order', 'two');
                } else {
                    $target.attr('data-order', 'two');
                };
            };
        };
    });

    //Event handler for adding selection
    $('#add').click(function(event) {
        var $files = $('.selected-file');
        var first_file = $files.first().text();
        var second_file = $files.last().text();
        var $cols = $('.selected-column');
        if ($files.length < 2) {
            warning('Must select two files');
        } else if ($('[data-order="one"]').length < 2) {
            warning('Must select a column to join on');
        }  else if ($cols.length != 2 && $cols.length != 4) {
            warning('Can only join on same number of columns');
        } else if ($cols.text().includes(',')) {
            warning("Column name can't contain commas");
        } else {
            var contains = true;
            $('td').each(function() {
                if ($(this).text() == first_file || $(this).text() == second_file) {
                    contains = false;
                }
            });
            if ($('td').length != 0 && contains) {
                warning('Selection must contain at least one previously selected file');
            } else {
                $('#selected').show();
                var msg = '';
                msg += '<td><span class="file">' + first_file + '</span></td>';
                msg += '<td><span class="file">' + second_file + '</span></td>';
                if ($cols.length == 2) {
                    msg += '<td><span class="col">' + $cols.first().text() + '</span></td>';
                    msg += '<td><span class="col">' + $cols.last().text() + '</span></td>';
                } else if ($cols.length == 4) {
                    msg += '<td><span class="col">' + $cols.eq(0).text() + ", " + $cols.eq(1).text() + '</span></td>';
                    msg += '<td><span class="col">' + $cols.eq(2).text() + ", " + $cols.eq(3).text() + '</span></td>';
                };
                $('tbody').append('<tr class="body">' + msg + '</tr>');
                $files.removeClass('selected-file');
                $cols.removeClass('selected-column');
                $cols.removeAttr('data-order');
                $('.columns-list').html('<p class="before">Select a file from the left</p>');
            };
        } 
    }); 

    //Event handler for reseting selections
    $('#reset').click(function(event) {
        event.preventDefault();
        $('tbody').html("");
        $('.selected-file').removeClass();
        $('.selected-column').removeClass();
        $('.selected-column').removeAttr('data-order');
        $('#selected').hide();
        socket.emit('reset');
    });

    //Event handler for joining files
    $('#join').click(function(event) {
        var joins = []
        $('#selections').find('tr.body').each(function() {
            var row = {};
            $this = $(this);
            $files = $this.find('.file');
            $cols = $this.find('.col');
            row['file1'] = $files.first().text();
            row['file2'] = $files.last().text();
            row['col1'] = $cols.first().text().split(', ');
            row['col2'] = $cols.last().text().split(', ');
            joins.push(row);
        });
        socket.emit('join request', {data : joins});
    });

    //Download file once server responds
    socket.on('join response', function(data) {
        window.open('download');
        $('#reset').click();
        if (data['count'] > 0) {
            $('#correlation span').html(data['msg']);
            $('#correlation').show();
        }
    });

    //Clear everything from directory upon refresh
    $(window).on('beforeunload', function(event) {
        socket.emit('refresh');
    });

});