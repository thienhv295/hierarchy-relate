

var valueField;
var valueFields;

var rbChart = {
    makeChart: function(opts) {
        var $$ = this;
        var defautls = {
            container: "",
            width: 550,
            height: 650,
            valueField: "size",
            valueFields: ["size"],
            tooltip: {
                prefix: "",
                suffix: "",
                format: ",.2f"
            },
            margin: {
                top: 20,
                right: 10,
                bottom: 10,
                left: 10
            }
        }

        opts.tooltip = $.extend(defautls.tooltip, opts.tooltip);
        opts.margin = $.extend(defautls.margin, opts.margin);

        var cfg = $.extend(defautls, opts);
        var tooltip = cfg.tooltip;
        var margin = cfg.margin;
        var viz_container;
        var viz;
        var theme;
        // nested data
        var data = {};
        // stores the currently selected value field
        valueField = cfg.valueField;
        valueFields = cfg.valueFields;
        var formatCurrency = function (d) { if (isNaN(d)) d = 0; return tooltip.prefix + d3.format(tooltip.format)(d) + tooltip.suffix; };

        data.values=prepData(cfg.data);

        initialize();

        
        function prepData(nest) {
            
            //This will be a viz.data function;
            vizuly.core.util.aggregateNest(nest, valueFields, function (a, b) {
                
                return Number(a) + Number(b);
            });


            //Remove empty child nodes left at end of aggregation and add unqiue ids
            function removeEmptyNodes(node,parentId,childId) {
                if (!node) return;
                node.id=parentId + "_" + childId;
                if (node.values) {
                    for(var i = node.values.length - 1; i >= 0; i--) {
                        node.id=parentId + "_" + i;
                        if(!node.values[i].key && !node.values[i].Level4) {
                            node.values.splice(i, 1);
                        }
                        else {
                            removeEmptyNodes(node.values[i],node.id,i)
                        }
                    }
                }
            }

            var node={};
            node.values = nest;
            removeEmptyNodes(node,"0","0");


            var blob = JSON.stringify(nest);

            return nest;

        }

        function initialize() {
            var width = cfg.width + (margin.left + margin.right);
            var height = cfg.height + (margin.top + margin.bottom);
            viz_container = d3.selectAll(cfg.container)
                    .style("width", width + "px")
                    .style("height", height + "px");

            $$.viz = vizuly.viz.weighted_tree(document.getElementById("viz_container"));


            //Here we create three vizuly themes for each radial progress component.
            //A theme manages the look and feel of the component output.  You can only have
            //one component active per theme, so we bind each theme to the corresponding component.
            theme = vizuly.theme.weighted_tree($$.viz).skin(vizuly.skin.WEIGHTED_TREE_AXIIS);

            //Like D3 and jQuery, vizuly uses a function chaining syntax to set component properties
            //Here we set some bases line properties for all three components.
            $$.viz.data(data)                                                      // Expects hierarchical array of objects.
                .width(cfg.width)                                               // Width of component
                .height(cfg.height)                                             // Height of component
                .children(function (d) { return d.values })                     // Denotes the property that holds child object array
                .key(function (d) { return d.id })                              // Unique key
                .value(function (d) {
                    return Number(d["agg_" + valueField]) })                    // The property of the datum that will be used for the branch and node size
                .fixedSpan(-1)                                                  // fixedSpan > 0 will use this pixel value for horizontal spread versus auto size based on viz width
                .branchPadding(.07)
                .label(function (d) {                                           // returns label for each node.
                    return trimLabel(d.key || (d['Level' + d.depth]))})
                .on("measure",onMeasure)                                        // Make any measurement changes
                .on("mouseover",onMouseOver)                                    // mouseover callback - all viz components issue these events
                .on("mouseout",onMouseOut)                                      // mouseout callback - all viz components issue these events
                .on("click",onClick);                                           // mouseout callback - all viz components issue these events


            //We use this function to size the components based on the selected value from the RadiaLProgressTest.html page.
           
            changeSize(width, height);

            // Open up some of the tree branches.
            $$.viz.toggleNode(data.values[2]);
            $$.viz.toggleNode(data.values[2].values[0]);
            $$.viz.toggleNode(data.values[3]);

        }


        function trimLabel(label) {
           return (String(label).length > 20) ? String(label).substr(0, 17) + "..." : label;
        }


        var datatip='<div class="tooltip" style="width: 250px; background-opacity:.5">' +
            '<div class="header1">HEADER1</div>' +
            '<div class="header-rule"></div>' +
            '<div class="header2"> HEADER2 </div>' +
            '<div class="header-rule"></div>' +
            '<div class="header3"> HEADER3 </div>' +
            '</div>';


        // This function uses the above html template to replace values and then creates a new <div> that it appends to the
        // document.body.  This is just one way you could implement a data tip.
        function createDataTip(x,y,h1,h2,h3) {

            var html = datatip.replace("HEADER1", h1);
            html = html.replace("HEADER2", h2);
            html = html.replace("HEADER3", h3);

            d3.select("body")
                .append("div")
                .attr("class", "vz-weighted_tree-tip")
                .style("position", "absolute")
                .style("top", y + "px")
                .style("left", (x - 125) + "px")
                .style("opacity",0)
                .html(html)
                .transition().style("opacity",1);

        }

        function onMeasure() {
           // Allows you to manually override vertical spacing
           // viz.tree().nodeSize([100,0]);
        }

        function onMouseOver(e,d,i) {
            if (d == data) return;
            var rect = e.getBoundingClientRect();
            if (d.target) d = d.target; //This if for link elements
            createDataTip(rect.left, (rect.top+$$.viz.height() *.05), (d.key || (d['Level' + d.depth])), formatCurrency(d["agg_" + valueField]),valueField);


        }

        function onMouseOut(e,d,i) {
            d3.selectAll(".vz-weighted_tree-tip").remove();
        }



        //We can capture click events and respond to them
        function onClick(g,d,i) {
            $$.viz.toggleNode(d);
        }



        //This function is called when the user selects a different skin.
        function changeSkin(val) {
            if (val == "None") {
                theme.release();
            }
            else {
                theme.viz($$.viz);
                theme.skin(val);
            }

            viz().update();  //We could use theme.apply() here, but we want to trigger the tween.
        }

        //This changes the size of the component by adjusting the width/height;
        function changeSize(width, height) {
            viz_container.transition().duration(300).style('width', width + 'px').style('height', height + 'px');
            $$.viz.width(width).height(height*.9).update();
        }

        //This sets the same value for each radial progress
        function changeData(val) {
            valueField=valueFields[Number(val)];
            $$.viz.update();
        }
    },
    changeData: function(val) {
        var $$ = this;
        valueField = valueFields[Number(val)];

        $$.viz.update();
    }
}





