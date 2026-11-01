import { getContainerRuntimeClient } from "testcontainers";

try {
  await getContainerRuntimeClient();
} catch {
  console.error("missing container runtime");

  process.exit(1);
}
