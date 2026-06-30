package com.github.danbel.api.model.enums;

import java.util.Arrays;

public final class JsonEnums {

    private JsonEnums() {
    }

    public static <E extends Enum<E> & JsonEnum> E fromValue(Class<E> enumType, String value) {
        if (value == null) {
            throw new IllegalArgumentException("Unknown " + enumType.getSimpleName() + ": null");
        }
        return Arrays.stream(enumType.getEnumConstants())
                .filter(item -> item.getValue().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown " + enumType.getSimpleName() + ": " + value));
    }
}
