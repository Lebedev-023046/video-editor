self.onmessage = () => {
  self.postMessage({
    type: "not-ready",
    message: "Video merge worker will be implemented in task 4.0.",
  });
};
