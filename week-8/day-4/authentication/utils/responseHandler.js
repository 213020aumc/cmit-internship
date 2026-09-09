export const sendResponse = (
  res,
  status,
  data = null,
  message = "",
  extra = {},
) => {
  res.status(status).json({
    success: true,
    message,
    data,
    ...extra,
  });
};
