window.setFluid = function (fluid) {
  window._fluid = fluid;
}

var width = null;
var height = null;
window.setTouchIndicator = function(index, position) {
  // if (!width) {
  //   width = $('body').width();
  //   height = $('body').height();
  // }
  // $('#touch-indicator-' + index).addClass('visible').css({
  //   transform: 'translate(' + width * position.x + 'px, ' + height * position.y + 'px)'
  // });
}

window.removeTouchIndicator = function(index) {
  // $('#touch-indicator-' + index).removeClass('visible');
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

  // for (var i = 0; i < 30; i++) {
  //   $('#indicators').append($('<div>').addClass('touch-indicator').attr('id', 'touch-indicator-' + i));
  // }
});