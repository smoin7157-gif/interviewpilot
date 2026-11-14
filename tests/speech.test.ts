import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MEDIA_DEVICE_ID,
  describeMediaError,
  displayDeviceLabel,
  filterMediaInputDevices,
  mediaDeviceConstraint,
} from "../src/lib/speech";

describe("displayDeviceLabel", () => {
  it("keeps a non-empty browser label", () => {
    assert.equal(displayDeviceLabel("USB Audio", "audio", 1), "USB Audio");
  });

  it("falls back to numbered placeholders when the label is hidden", () => {
    assert.equal(displayDeviceLabel("", "audio", 2), "Microphone 2");
    assert.equal(displayDeviceLabel("   ", "video", 1), "Camera 1");
  });
});

describe("filterMediaInputDevices", () => {
  it("maps audio and video inputs and skips empty or default ids", () => {
    const { audio, video } = filterMediaInputDevices([
      { deviceId: "default", label: "Default", kind: "audioinput" },
      { deviceId: "mic-a", label: "", kind: "audioinput" },
      { deviceId: "mic-b", label: "Headset", kind: "audioinput" },
      { deviceId: "cam-1", label: "", kind: "videoinput" },
      { deviceId: "", label: "Ghost", kind: "videoinput" },
      { deviceId: "out", label: "Speakers", kind: "audiooutput" },
    ]);
    assert.equal(audio.length, 2);
    assert.equal(audio[0]?.label, "Microphone 1");
    assert.equal(audio[1]?.label, "Headset");
    assert.equal(video.length, 1);
    assert.equal(video[0]?.label, "Camera 1");
  });
});

describe("mediaDeviceConstraint", () => {
  it("uses the system default when no device id is set", () => {
    assert.equal(mediaDeviceConstraint(undefined), true);
    assert.equal(mediaDeviceConstraint(DEFAULT_MEDIA_DEVICE_ID), true);
  });

  it("pins a specific device with an exact constraint", () => {
    assert.deepEqual(mediaDeviceConstraint("abc-123"), { deviceId: { exact: "abc-123" } });
  });
});

describe("describeMediaError", () => {
  it("maps microphone failures", () => {
    const err = new DOMException("denied", "NotAllowedError");
    assert.match(describeMediaError(err, "microphone"), /microphone/i);
  });

  it("maps camera failures", () => {
    const err = new DOMException("missing", "NotFoundError");
    assert.match(describeMediaError(err, "camera"), /camera/i);
  });

  it("surfaces over-constrained device selection", () => {
    const err = new DOMException("bad device", "OverconstrainedError");
    assert.match(describeMediaError(err, "microphone"), /system default/i);
  });
});
