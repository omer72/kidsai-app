// A one-word story ("hiiiiiii") gives the model nothing to work with.
// Flows use this to ask the parent if they want to add anything before sending.
export function isStoryThin(story) {
  return (story || '').trim().split(/\s+/).filter(Boolean).length < 3;
}
