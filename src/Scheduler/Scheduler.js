/** @namespace    Voodoo
  * @class        Scheduler
  * @description  A scheduler which batches DOM updates and executes them when the browser
  *               has free time at the end of the frame or when the user is inactive.
  *               This approach uses requestIdleCallback and requestAnimationFrame API
  *               to prevent "layout jank" caused by forced browser's reflow
  *
  *               Jobs can't be runned inside the idle callback because the free time
  *               could occures at the end of the frame (where style changes have already been applied)
                  causing layout calculations to be invalidated.
  *               For these reasons, when a job requests to be scheduled, the Scheduler put it on a queue
  *               and schedules it for the next idle time. When it happens the Scheduler
  *               request the next frame to run the job.
  *
  *               Usage:
  *                  <button id="trigger" onClick="add()">Add new text node</button>
  *                  <div id="container"></div>
  *
  *                  <script type="text/javascript">
  *                    var counter = 0;
  *                    const s = new Voodoo.Scheduler();
  *
  *                    var el = document.getElementById("trigger");
  *                    var job = function() {
  *                      el.appendChild(document.createTextNode("div " + (counter++)));
  *                    }
  *
  *                    var add = function() {
  *                      s.schedule(job.bind(this));
  *                    }
  *                  </script>
  *
  * @see            https://developers.google.com/web/updates/2015/08/using-requestidlecallback
  */
import { rIC, cIC } from "./idleCallback.js";
import rAF from "./animationFrame.js";

export default class Scheduler {
  constructor() {
    this.queue = [];
    this.scheduled = false;
  }

  /** @method       flush
    * @description  execute all jobs in the queue
    * @param        {function} job      the callback to execute
    */
  flush() {
    const q = this.queue;

    // execute jobs with FIFO
    let job; while (job = q.shift()) job();

    this.scheduled = false;
  }

  scheduleFrameUpdate() {
    rAF(this.flush.bind(this));
  }

  /** @method       schedule
    * @description  schedule a new job
    * @param        {function} job      the callback to execute
    */
  schedule(job) {
    // push the job in the waiting queue
    this.queue.push(job);

    // if there isn't already a job scheduled
    if(!this.scheduled) {
      // schedule a frame update
      rIC(this.scheduleFrameUpdate.bind(this));
      this.scheduled = true;
    }

  }


}
