window.setFluid = function (fluid) {
  window._fluid = fluid;
}

$(document).ready(function () {
  var COUNTER_WAIT = 60;

  var counter = COUNTER_WAIT;
  function updateCounter() {
    $(".counter").text(counter);
    counter--;
    if (counter === -1) {
      $("#flash").addClass('visible');
      setTimeout(function () {
        $("#flash").addClass('fade-out');
        setTimeout(function () {
          $("#flash").removeClass('visible fade-out');
        }, 1500)
      }, 10)
      window._fluid.particles.reset();
      counter = COUNTER_WAIT;
    }
  }
  $(".counter").text(counter);
  setInterval(updateCounter, 1000);
});