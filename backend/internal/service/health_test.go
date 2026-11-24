package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHealthServiceCheckReturnsOk(t *testing.T) {
	assert.Equal(t, HealthStatus{Status: "ok"}, NewHealthService().Check())
}
