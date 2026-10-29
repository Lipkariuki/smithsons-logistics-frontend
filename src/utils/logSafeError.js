// Log only fixed event labels and HTTP status codes, never Axios objects.
// Axios errors can contain passwords, Authorization headers and response bodies.
function safeDiagnostic(errors) {
  return { statuses: errors.map(error => error?.response?.status)
    .filter(status => Number.isInteger(status) && status >= 100 && status <= 599) };
}
export function logApiError(label, ...errors) {
  console.error(label, safeDiagnostic(errors));
}
export function logApiWarning(label, ...errors) {
  console.warn(label, safeDiagnostic(errors));
}
