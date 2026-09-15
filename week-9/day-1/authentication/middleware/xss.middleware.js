import sanitizeHtml from "sanitize-html";

const sanitize = (data) => {
  if (typeof data === "string") {
    return sanitizeHtml(data, {
      allowedTags: [], // completely removes all tags (e.g., <script>, <b>)
      allowedAttributes: {},
    });
  }
  if (Array.isArray(data)) return data.map((item) => sanitize(item));
  if (typeof data === "object" && data !== null) {
    Object.keys(data).forEach((key) => {
      data[key] = sanitize(data[key]);
    });
  }
  return data;
};

export const xssClean = (req, res, next) => {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};
