var _          = require('lodash')
  ,  instagram = require('instagram-node').instagram()
  , q = require('q')
;

module.exports = {
  /**
   * The main entry point for the Dexter module
   *
   * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
   * @param {AppData} dexter Container for all data used in this workflow.
   */
  run: function(step, dexter) {
    var self = this
      , access_token = dexter.provider('instagram').credentials('access_token')
      , userIds      = step.input('userId')
      , usernames    = step.input('username')
    ;

    if(_.isEmpty(access_token)) return this.fail('Instagram access token is required');
    instagram.use({ access_token: access_token });

    q.all(
      _.map(usernames, function(username) {
        var deferred = q.defer();
        instagram.user_search(username, deferred.makeNodeResolver());
        return deferred.promise
          .then(function(results) {
            var users = results[0];
            return _.pluck(users, 'id');
          })
        ;
      })
    ).then(function (results) {
      var extraUserIds = _.map(results, function(result) { return result[0]; });
      userIds = Array.prototype.slice.call(userIds).concat(extraUserIds);
      if(_.isEmpty(userIds)) return this.fail('User ID required');

      console.log(userIds);

      return q.all(
        _.map(userIds, function(userId) {
          var deferred = q.defer();
          instagram.user(userId, deferred.makeNodeResolver());
          return deferred.promise
            .then(function(results) {
              return results[0];
            })
          ;
        })
      ).then(function(users) {
        self.complete(_.map(users, function(user) {
          return {
            username          : _.get(user, 'username')
            , full_name       : _.get(user, 'full_name')
            , profile_picture : _.get(user, 'profile_picture')
            , bio             : _.get(user, 'bio')
            , website         : _.get(user, 'website')
            , media           : _.get(user, 'counts.media')
            , follows         : _.get(user, 'counts.follows')
            , followed_by     : _.get(user, 'counts.followed_by')
          };
        }));
      });
    })
    .catch(this.fail.bind(this));
  }
};
