package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;

public final class ErrorAssertions {

    private ErrorAssertions() {
    }

    public static void assertError(ThrowingCallable action, ErrorCode expected) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,
                exception -> assertThat(exception.errorCode()).isEqualTo(expected));
    }
}
