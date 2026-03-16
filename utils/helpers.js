exports.generateRandomString = (length = 10) => {
  return Math.random().toString(36).substr(2, length);
};

exports.paginate = (model, query, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  return model.find(query).skip(startIndex).limit(limit);
};