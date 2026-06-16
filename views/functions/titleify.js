    // Function to title-case the show name (convert to 'Title Case')
    function titleify(showName) {
      return showName.replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      }).replace(/_/g, ' '); // Replace underscores with spaces
    }