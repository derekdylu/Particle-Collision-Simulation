String str;

void setup() {
  pinMode(12, OUTPUT);
  pinMode(A0, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void blink(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
    delay(200);
  }
}

void loop() {
  if (Serial.available()) {
    str = Serial.readStringUntil('\n');

    if (str == "ON") {
      blink(1);
      digitalWrite(12, HIGH);
      delay(1000);
      digitalWrite(12, LOW);
      delay(1000);
    } 
    else {
      digitalWrite(12, LOW);
      digitalWrite(LED_BUILTIN, LOW);
    }

    if (str == "BALL") {
      blink(2);
      int value = digitalRead(A0);
      if (value == HIGH) {
        Serial.println("HIGH");
      } else {
        Serial.println("LOW");
      }
    }
  }
}
