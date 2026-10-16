"""Optional MQTT alert publisher. Never required: if paho-mqtt is missing or the
broker is unreachable, the publisher disables itself and JSONL logging continues."""
from __future__ import annotations

import json
import logging

log = logging.getLogger("sentinel.mqtt")


class MqttPublisher:
    def __init__(self, host: str, port: int, topic: str, qos: int = 1, client_id: str = "workplace-safety-sentinel"):
        self.topic = topic
        self.qos = qos
        self.enabled = False
        self.published = 0
        self._client = None
        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            log.warning("paho-mqtt not installed; MQTT alerts disabled (pip install paho-mqtt)")
            return
        try:
            try:
                client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
            except AttributeError:  # paho-mqtt 1.x
                client = mqtt.Client(client_id=client_id)
            client.connect(host, int(port), keepalive=30)
            client.loop_start()
        except Exception as exc:  # broker down, DNS failure, refused ...
            log.warning("MQTT broker %s:%s unavailable (%s); MQTT alerts disabled", host, port, exc)
            return
        self._client = client
        self.enabled = True
        log.info("MQTT connected to %s:%s, topic %s", host, port, topic)

    def publish(self, incident: dict) -> bool:
        if not self.enabled:
            return False
        try:
            info = self._client.publish(self.topic, json.dumps(incident), qos=self.qos)
            info.wait_for_publish(timeout=5)
            ok = info.is_published()
        except Exception as exc:
            log.warning("MQTT publish failed: %s", exc)
            return False
        if ok:
            self.published += 1
        return ok

    def close(self) -> None:
        if self._client is not None:
            self._client.loop_stop()
            self._client.disconnect()
