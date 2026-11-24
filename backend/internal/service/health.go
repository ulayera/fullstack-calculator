package service

type HealthStatus struct {
	Status string `json:"status"`
}

type HealthService interface {
	Check() HealthStatus
}

type healthService struct{}

func NewHealthService() HealthService {
	return healthService{}
}

func (healthService) Check() HealthStatus {
	return HealthStatus{Status: "ok"}
}
