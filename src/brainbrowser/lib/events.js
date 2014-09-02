/*
* BrainBrowser: Web-based Neurological Visualization Tools
* (https://brainbrowser.cbrain.mcgill.ca)
*
* Copyright (C) 2011
* The Royal Institution for the Advancement of Learning
* McGill University
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
* Author: Tarek Sherif <tsherif@gmail.com> (http://tareksherif.ca/)
*/

(function() {
  "use strict";

  BrainBrowser.events = {
    
    /**
    * @doc function
    * @name BrainBrowser.events:addEventModel
    * @param {object} object Any JavaScript object.
    *
    * @description
    * Add event model methods to the object passed as argument.
    * ```js
    * BrainBrowser.events.addEventModel(object);
    * ```
    */
    addEventModel: function(object) {
      var event_listeners = [];
      var propagated_events = {};

      /**
      * @doc function
      * @name BrainBrowser.Event Model:addEventListener
      * @param {string} event\_name The event name.
      * @param {function} callback The event handler. 
      *
      * @description
      * Add an event handler to handle event **event\_name**.
      * ```js
      * listening_object.addEventListener("my-event", function(message) {
      *   // Handle event.
      * });
      * ```
      *
      * The arguments passed to the handler are those passed to **triggerEvent()**. 
      * Consult documentation for the **Surface Viewer** or **Volume Viewer** for 
      * details about normal lifecycle events for each app.
      *
      * Note that "*" can be given as the **event\_name** to add a handler to any
      * event that is trigger on the object. The actual name of the triggered event
      * will be passed as first argument to these types of handlers.
      */
      object.addEventListener = function(event_name, callback) {
        if (!event_listeners[event_name]) {
          event_listeners[event_name] = [];
        }
        
        event_listeners[event_name].push(callback);
      };

      /**
      * @doc function
      * @name BrainBrowser.Event Model:triggerEvent
      * @param {string} event\_name The event name. 
      *
      * @description
      * Trigger all handlers associated with event **event\_name**.
      * Any arguments after the first will be passed to the 
      * event handler.
      * ```js
      * trigger_object.triggerEvent("my-event", "Some info");
      * ```
      */
      object.triggerEvent = function(event_name) {
        var trigger = this;
        var full_args = Array.prototype.slice.call(arguments);
        var args = full_args.slice(1);
        var propagate_to = object.directPropagationTargets(event_name);

        if (event_listeners[event_name]) {
          event_listeners[event_name].forEach(function(callback) {
            callback.apply(trigger, args);
          });
        }

        if (event_listeners["*"]) {
          event_listeners["*"].forEach(function(callback) {
            callback.apply(trigger, full_args);
          });
        }

        propagate_to.forEach(function(other) {
          other.triggerEvent.apply(trigger, full_args);
        });

        if (propagate_to.length === 0 && object !== BrainBrowser.events) {
          BrainBrowser.events.triggerEvent.apply(trigger, full_args);
        }
      };

      /**
      * @doc function
      * @name BrainBrowser.Event Model:propagateEventTo
      * @param {string} event\_name The event name.
      * @param {object} other The object to propagate events to. 
      *
      * @description
      * Propagate any events triggered on this object to the object given as
      * argument.
      * ```js
      * source_object.propagateEventTo("my-event", target_object);
      * ```
      *
      * Note that "*" can be given as the **event\_name** to propagate all
      * events to the target object.
      *
      * **IMPORTANT:** There is a risk of memory leaks when propagating events
      * as the source object will maintain a reference to the target object,
      * preventing it from being garbage collected. To avoid this, trigger the
      * the **eventmodelcleanup** event on the target object when it will no longer
      * be used. This will remove all event model references to it.
      * ```js
      * target_object.triggerEvent("eventmodelcleanup");
      * ```
      */
      object.propagateEventTo = function(event_name, other) {
        if (!BrainBrowser.utils.isFunction(other.allPropagationTargets)) {
          throw new Error("Propagation target doesn't seem to have an event model.");
        }

        if (object === BrainBrowser.events || other.allPropagationTargets(event_name).indexOf(object) !== -1) {
          throw new Error("Propagating event '" + event_name + "' would cause a cycle.");
        }

        propagated_events[event_name] = propagated_events[event_name] || [];

        if (object.directPropagationTargets().indexOf(other) === -1) {
          other.addEventListener("eventmodelcleanup", function() {
            if (this === other) {
              object.stopPropagatingTo(other);
            }
          });
        }

        if (propagated_events[event_name].indexOf(other) === -1) {
          propagated_events[event_name].push(other);
        }

      };

      /**
      * @doc function
      * @name BrainBrowser.Event Model:propagateEventFrom
      * @param {string} event\_name The event name.
      * @param {object} other The object to propagate events from. 
      *
      * @description
      * Propagate any events triggered on the object given as
      * argument to this object. 
      * ```js
      * target_object.propagateEventFrom("my-event", source_object);
      * ```
      *
      * Note that "*" can be given as the **event\_name** to propagate all
      * events to from the source object.
      *
      * **IMPORTANT:** There is a risk of memory leaks when propagating events
      * as the source object will maintain a reference to the target object,
      * preventing it from being garbage collected. To avoid this, trigger the
      * the **eventmodelcleanup** event on the target object when it will no longer
      * be used. This will remove all event model references to it.
      * ```js
      * target_object.triggerEvent("eventmodelcleanup");
      * ```
      */
      object.propagateEventFrom = function(event_name, other) {
        other.propagateEventTo(event_name, object);
      };

      /**
      * @doc function
      * @name BrainBrowser.Event Model:stopPropagatingTo
      * @param {object} other The object to cancel propagations to. 
      *
      * @description
      * Cancel all propagations to the object given as argument.
      *
      * ```js
      * source_object.stopPropagatingTo(target_object);
      * ```
      */
      object.stopPropagatingTo = function(other) {
        Object.keys(propagated_events).forEach(function(event_name) {
          propagated_events[event_name] = propagated_events[event_name].filter(function(target) { return target !== other; });
        });
      };

      /**
      * @doc function
      * @name BrainBrowser.Event Model:directPropagationTargets
      * @param {string} event\_name The event name.
      *
      * @returns {array} List of objects this object directly propagates **event\_name** to.
      *
      * @description
      * Return an array of all objects this object directly propagates **event\_name** to.
      *
      * ```js
      * object.directPropagationTargets("my-event");
      * ```
      *
      */
      object.directPropagationTargets = function(event_name) {
        var propagation_targets = [];
        var event_names = event_name === undefined ? Object.keys(propagated_events) : [event_name, "*"];
        
        event_names.forEach(function(event_name) {
          var targets = propagated_events[event_name] || [];
          targets.forEach(function(other) {
            if (propagation_targets.indexOf(other) === -1) {
              propagation_targets.push(other);
            }
          });
        });

        return propagation_targets;
      };

      /**
      * @doc function
      * @name BrainBrowser.Event Model:allPropagationTargets
      * @param {string} event\_name The event name.
      *
      * @returns {array} List of all objects this object propagates **event\_name** to.
      *
      * @description
      * Return an array of all objects this object propagates **event\_name**
      * to including those triggered recrusively.
      *
      * ```js
      * object.allPropagationTargets("my-event");
      * ```
      *
      */
      object.allPropagationTargets = function(event_name) {
        var direct_targets = object.directPropagationTargets(event_name);
        var propagation_targets = Array.prototype.slice.call(direct_targets);

        direct_targets.forEach(function(target) {
          target.allPropagationTargets(event_name).forEach(function(recursive_target) {
            if (propagation_targets.indexOf(recursive_target) === -1) {
              propagation_targets.push(recursive_target);
            }
          });
        });

        return propagation_targets;
      };
    }
  };

  BrainBrowser.events.addEventModel(BrainBrowser.events);
})();
