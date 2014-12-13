(function () {

nv.models.linePlusMultiBarChart = function() {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var multibar = nv.models.multiBar(),
        lines = nv.models.line()
        , xAxis = nv.models.axis()
        , y1Axis = nv.models.axis()
        , y2Axis = nv.models.axis()
        , legend = nv.models.legend()
        , controls = nv.models.legend()
        ;

    var margin = {top: 30, right: 20, bottom: 50, left: 60}
        , width = null
        , height = null
        , color = nv.utils.defaultColor()
        , showControls = true
        , showLegend = true
        , showXAxis = true
        , showYAxis = true
        , rightAlignYAxis = false
        , reduceXTicks = true // if false a tick will show for every data point
        , staggerLabels = false
        , rotateLabels = 0
        , tooltips = true
        , tooltip = function (key, x, y, e, graph) {
            return '<h3>' + key + '</h3>' +
                '<p>' + y + ' on ' + x + '</p>'
        }
        , x //can be accessed via chart.xScale()
        , y1 //can be accessed via chart.yScale()
        , y2 //can be accessed via chart.yScale()
        , state = {stacked: false}
        , defaultState = null
        , noData = "No Data Available."
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
        , controlWidth = function () {
            return showControls ? 180 : 0
        }
        , transitionDuration = 250
        ;

    multibar
        .stacked(false)
    ;
    lines
        .clipEdge(false)
        .padData(true)
    ;
    xAxis
        .orient('bottom')
        .tickPadding(7)
        .highlightZero(true)
        .showMaxMin(false)
        .tickFormat(function (d) {
            return d
        })
    ;
    y1Axis
        .orient((rightAlignYAxis) ? 'right' : 'left')
        .tickFormat(d3.format(',.1f'))
    ;
    y2Axis
        .orient('right')
    ;

    controls.updateState(false);
    //============================================================


    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function (e, offsetElement) {
        var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
            top = e.pos[1] + ( offsetElement.offsetTop || 0),
            x = xAxis.tickFormat()(multibar.x()(e.point, e.pointIndex)),
            y = (e.series.bar ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
            content = tooltip(e.series.key, x, y, e, chart);

        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };

    //============================================================


    function chart(selection) {
        selection.each(function (data) {
            var container = d3.select(this),
                that = this;

            var availableWidth = (width || parseInt(container.style('width')) || 960)
                    - margin.left - margin.right,
                availableHeight = (height || parseInt(container.style('height')) || 400)
                    - margin.top - margin.bottom;

            chart.update = function () {
                container.transition().duration(transitionDuration).call(chart)
            };
            chart.container = this;

            //set state.disabled
            state.disabled = data.map(function (d) {
                return !!d.disabled
            });

            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }
            //------------------------------------------------------------
            // Display noData message if there's nothing to show.

            if (!data || !data.length || !data.filter(function (d) {
                    return d.values.length
                }).length) {
                var noDataText = container.selectAll('.nv-noData').data([noData]);

                noDataText.enter().append('text')
                    .attr('class', 'nvd3 nv-noData')
                    .attr('dy', '-.7em')
                    .style('text-anchor', 'middle');

                noDataText
                    .attr('x', margin.left + availableWidth / 2)
                    .attr('y', margin.top + availableHeight / 2)
                    .text(function (d) {
                        return d
                    });

                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup Scales

            x = multibar.xScale();
            y1 = multibar.yScale();
            y2 = lines.yScale();

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup containers and skeleton of chart

            var wrap = container.selectAll('g.nv-wrap.nv-linePlusMultiBar').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusMultiBar').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y1 nv-axis');
            gEnter.append('g').attr('class', 'nv-y2 nv-axis');
            gEnter.append('g').attr('class', 'nv-barsWrap');
            gEnter.append('g').attr('class', 'nv-linesWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');
            gEnter.append('g').attr('class', 'nv-controlsWrap');

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Legend

            if (showLegend) {
                legend.width(availableWidth - controlWidth());

                if (multibar.barColor())
                    data.forEach(function (series, i) {
                        series.color = d3.rgb('#ccc').darker(i * 1.5).toString();
                    });

                g.select('.nv-legendWrap')
                    .datum(data.map(function(series) {
                        series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
                        series.key = series.originalKey + (series.bar ? ' (left axis)' : ' (right axis)');
                        return series;
                    }))
                    .call(legend);

                if (margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                    - margin.top - margin.bottom;
                }

                g.select('.nv-legendWrap')
                    .attr('transform', 'translate(' + controlWidth() + ',' + (-margin.top) + ')');
            }

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Controls

            if (showControls) {
                var controlsData = [
                    {key: 'Grouped', disabled: multibar.stacked()},
                    {key: 'Stacked', disabled: !multibar.stacked()}
                ];

                controls.width(controlWidth()).color(['#444', '#444', '#444']);
                g.select('.nv-controlsWrap')
                    .datum(controlsData)
                    .attr('transform', 'translate(0,' + (-margin.top) + ')')
                    .call(controls);
            }

            //------------------------------------------------------------


            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            if (rightAlignYAxis) {
                g.select(".nv-y.nv-axis")
                    .attr("transform", "translate(" + availableWidth + ",0)");
            }

            //------------------------------------------------------------
            // Main Chart Component(s)

            lines
                .width(availableWidth)
                .height(availableHeight)
                .color(data.map(function(d,i) {
                    return d.color || color(d, i);
                }).filter(function(d,i) { return !data[i].disabled && !data[i].bar }));

            multibar
                .disabled(data.map(function (series) {
                    return series.disabled
                }))
                .width(availableWidth)
                .height(availableHeight)
                .color(data.map(function (d, i) {
                    return d.color || color(d, i);
                }).filter(function (d, i) {
                    return !data[i].disabled && data[i].bar
                }));

            var linesWrap = g.select('.nv-linesWrap')
                .datum(dataLines[0] && !dataLines[0].disabled ? dataLines : [{values:[]}] );
            //.datum(!dataLines[0].disabled ? dataLines : [{values:dataLines[0].values.map(function(d) { return [d[0], null] }) }] );


            var barsWrap = g.select('.nv-barsWrap')
                .datum(data.filter(function (d) {
                    return !d.disabled
                }));

            barsWrap.transition().call(multibar);

            d3.transition(linesWrap).call(lines);

            //------------------------------------------------------------


            //------------------------------------------------------------
            // Setup Axes

            if (showXAxis) {
                xAxis
                    .scale(x)
                    .ticks(availableWidth / 100)
                    .tickSize(-availableHeight, 0);

                g.select('.nv-x.nv-axis')
                    .attr('transform', 'translate(0,' + y1.range()[0] + ')');
                g.select('.nv-x.nv-axis').transition()
                    .call(xAxis);

                var xTicks = g.select('.nv-x.nv-axis > g').selectAll('g');

                xTicks
                    .selectAll('line, text')
                    .style('opacity', 1);

                if (staggerLabels) {
                    var getTranslate = function (x, y) {
                        return "translate(" + x + "," + y + ")";
                    };

                    var staggerUp = 5, staggerDown = 17;  //pixels to stagger by
                    // Issue #140
                    xTicks
                        .selectAll("text")
                        .attr('transform', function (d, i, j) {
                            return getTranslate(0, (j % 2 == 0 ? staggerUp : staggerDown));
                        });

                    var totalInBetweenTicks = d3.selectAll(".nv-x.nv-axis .nv-wrap g g text")[0].length;
                    g.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
                        .attr("transform", function (d, i) {
                            return getTranslate(0, (i === 0 || totalInBetweenTicks % 2 !== 0) ? staggerDown : staggerUp);
                        });
                }

                if (reduceXTicks)
                    xTicks
                        .filter(function (d, i) {
                            return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
                        })
                        .selectAll('text, line')
                        .style('opacity', 0);

                if (rotateLabels)
                    xTicks
                        .selectAll('.tick text')
                        .attr('transform', 'rotate(' + rotateLabels + ' 0,0)')
                        .style('text-anchor', rotateLabels > 0 ? 'start' : 'end');

                g.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
                    .style('opacity', 1);
            }


            if (showYAxis) {
                y1Axis
                    .scale(y1)
                    .ticks(availableHeight / 36)
                    .tickSize(-availableWidth, 0);

                g.select('.nv-y.nv-axis').transition()
                    .call(y1Axis);
            }


            //------------------------------------------------------------


            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function (newState) {
                state = newState;
                dispatch.stateChange(state);
                chart.update();
            });

            controls.dispatch.on('legendClick', function (d, i) {
                if (!d.disabled) return;
                controlsData = controlsData.map(function (s) {
                    s.disabled = true;
                    return s;
                });
                d.disabled = false;

                switch (d.key) {
                    case 'Grouped':
                        multibar.stacked(false);
                        break;
                    case 'Stacked':
                        multibar.stacked(true);
                        break;
                }

                state.stacked = multibar.stacked();
                dispatch.stateChange(state);

                chart.update();
            });

            dispatch.on('tooltipShow', function (e) {
                if (tooltips) showTooltip(e, that.parentNode)
            });

            // Update chart from a state object passed to event handler
            dispatch.on('changeState', function (e) {

                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function (series, i) {
                        series.disabled = e.disabled[i];
                    });

                    state.disabled = e.disabled;
                }

                if (typeof e.stacked !== 'undefined') {
                    multibar.stacked(e.stacked);
                    state.stacked = e.stacked;
                }

                chart.update();
            });

            //============================================================


        });

        return chart;
    }


    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    multibar.dispatch.on('elementMouseover.tooltip', function (e) {
        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
    });

    multibar.dispatch.on('elementMouseout.tooltip', function (e) {
        dispatch.tooltipHide(e);
    });
    dispatch.on('tooltipHide', function () {
        if (tooltips) nv.tooltip.cleanup();
    });
}
})();