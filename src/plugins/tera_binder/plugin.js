/**
 * Plugin: "tera_binder" (selectize.js)
 * Copyright (c) 2015 Bastien Saro Chassetuillier
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 *
 * @author Bastien Saro Chassetuillier <bastien.saro.c@gmail.com>
 */

Selectize.define('tera_binder', function(options) {
	if (!this.settings.hasOwnProperty('disabled')) throw new Error('The "tera_binder" plugin requires Selectize v0.12.1 or higher".');
	var tera_binder_proc, register_target, init_own_rules, operate, hide, show, targets = {}, hided = {}, own_rules = {}, rule, i, self = this;
    $.extend(true, {}, {
        options : {
            target : "optgroup",
            mode : "hide"
        }
    }, options);

    self.setup = (function() {
        var original = self.setup;
        return function() {
            original.apply(this, arguments);
            self.$input.trigger("initialize");
        };
    })();

    self.render = (function(h) {
        var original = self.render, hided =h;
        return function() {
            var render = true, templateName = arguments[0], data = arguments[1];
            var opth= false;
            if(templateName== "optgroup_header") templateName = "optgroup";
            if(templateName=="option" || templateName=="item") {
                if(data.hasOwnProperty("optgroup")){
                    if(hided.hasOwnProperty("optgroup")){
                        var group, groups = data.optgroup;
                        if (!$.isArray(data.optgroup)) {
                            groups = [groups];
                        }
                        for(group in groups){
                            group = groups[group];
                            if(hided["optgroup"].hasOwnProperty(group)){
                                render = false;
                                break;
                            }
                        }
                    }
                }
            }
            if(render){
                render = !hided.hasOwnProperty(templateName) || !hided[templateName].hasOwnProperty(data.value);
            }
            if(render) return original.apply(this, arguments);
        };
    })(hided);

    self.getOptGroupOptions = function(id){
        var option, groups, ret = {}, self = this;
        for(option in self.options){
            groups = $.isArray(option.optgroup)? option.optgroup : [option.optgroup];
            if($.inArray(id, groups)){
                ret[option] = self.options[option];
            }
        }
        return ret;
    };

    register_target = function(id, callback){
        var nTarget = $("#"+id);
        if(!nTarget.hasOwnProperty("selectize")){
            nTarget.on("initialize", function(e){
                targets[id] = nTarget[0].selectize;
                callback();
            });
        }else {
            targets[id] = nTarget[0].selectize;
            callback();
        }
    };

    self.TeraBinderHide = function(target, value){
        if(!hided.hasOwnProperty(target)) hided[target] = {};
        hided[target][value] = true;
    };

    self.TeraBinderShow = function(target, value){
        if(hided.hasOwnProperty(target) && hided[target].hasOwnProperty(value)) delete hided[target][value];
    };

    operate = function($target, id, target_type, mode){
        var group, option, opt, replacement_value, value = {
            src : $target.getValue(),
            remove : function(value){
                if($.isArray(this.src)){
                    var i = $.inArray(value, this.src);
                    if(i>=-1) this.src.splice(i, 1);
                }else {
                    if(this.src==value){
                        this.src = null;
                    }
                }
            },
            replace : function(value){
                if($.isArray(this.src) && this.src == []){
                    this.src.push(value)
                }else if(this.src == null) {
                    this.src = value;
                }
            }
        };
        switch(target_type){
            case "optgroup":
                switch(mode){
                    case "hide":
                        for(group in $target.optgroups){
                            if(id == group){
                                $target.TeraBinderShow(target_type, group);
                                for(opt in $target.options){
                                    if(replacement_value) break;
                                    option = $target.options[opt];
                                    var option_group = $.isArray(option.optgroup)? option.optgroup : [option.optgroup];
                                    if($.inArray(group, option_group)>=0){
                                        replacement_value = opt;
                                    }
                                }
                            } else {
                                $target.TeraBinderHide(target_type, group);
                                for(option in $target.getOptGroupOptions(group)){
                                    value.remove(option);
                                }
                            }
                        }
                        break;
                    case "disable":
                        for(group in $target.optgroups){
                            if(id == group){
                                $target.disableOptionGroup(group, false);
                                for(opt in $target.options){
                                    option = $target.options[opt];
                                    if(replacement_value) continue;
                                    var option_group = $.isArray(option.optgroup)? option.optgroup : [option.optgroup];
                                    if($.inArray(group, option_group)>=0){
                                        replacement_value = opt;
                                    }
                                }
                            } else {
                                $target.disableOptionGroup(group, true);
                                for(option in $target.getOptGroupOptions(group)){
                                    value.remove(option);
                                }
                            }
                        }
                        break;
                }
                break;
            case "option":
                for(option in $target.options) {
                    switch (mode) {
                        case "hide":
                            if(id == option){
                                $target.TeraBinderShow(target_type, option);
                                if(!replacement_value) replacement_value = option;
                            } else {
                                $target.TeraBinderHide(target_type, option);
                                value.remove(option);
                            }
                            break;
                        case "disable":
                            if(id == option){
                                $target.disableOption(option, false);
                                if(!replacement_value) replacement_value = option;
                            } else {
                                $target.disableOption(option, true);
                                value.remove(option);
                            }
                            break;
                    }
                }
                break;
        }
        value.replace(replacement_value);
        $target.setValue(value.src);
    };

    init_own_rules = function(set){
        var line, rule_line, new_target, option_target;
        for(i in set.with){
            line = set.with[i];
            if($.isArray(line)){
                if(!own_rules.hasOwnProperty(line[0])){
                    own_rules[line[0]] = {};
                }
                rule_line = own_rules[line[0]];
                new_target = line[1];
                option_target = line[2] || set.target || options.options.target;
            }else{
                if(line.hasOwnProperty('values')){
                    var v;
                    for(v in line.values){
                        init_own_rules({
                            src : set.src,
                            to : set.to,
                            target : set.target,
                            with : [[line.values[v], line.to, line.target || set.target || options.options.target]]
                        });
                    }
                    continue;
                }else {
                    if(!own_rules.hasOwnProperty(line.value)){
                        own_rules[line.value] = {};
                    }
                    rule_line = own_rules[line.value];
                    new_target = line.to;
                    option_target = line.target || set.target || options.options.target;
                }
            }
            rule_line[set.to] = [option_target, new_target];
        }
    };

    tera_binder_proc = function(registred_target){
        var op = function(value){
            if($.isArray(value)){
                var v;
                for(v in value){
                    op(value[v]);
                }
            }
            if(!own_rules.hasOwnProperty(value)) return;
            var $target, rule = own_rules[value];
            for(i in rule){
                $target = targets[i];
                operate($target, rule[i][1], rule[i][0], options.options.mode);
                $target.refreshOptions(false);
                $target.refreshItems();
            }
        };
        op(self.getValue());
        self.on("change", op);
    };

    for(i in options.bind){
        rule = options.bind[i];
        if(rule.src != self.$input.attr("id")) continue;
        init_own_rules(rule);

        if(!targets.hasOwnProperty(rule.to)){
            register_target(rule.to, tera_binder_proc);
        }else {
            tera_binder_proc();
        }

    }
});