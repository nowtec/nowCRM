import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
        http_req_failed: ['rate<0.01'],    // Less than 1% failed requests
    },
    cloud: {
        // Optional: set your k6 Cloud project ID and test name
        // projectID: 3779885,
        name: 'CRM Auth Test'
    }
};

export default function () {
    const url = 'https://crm-test.nowtec.solutions/en/auth';
    const payload = JSON.stringify({
        email: '',
        password: ''
    });
    const params = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const res = http.post(url, payload, params);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response has token or dashboard': (r) => r.body && r.body.length > 0,
    });

    sleep(1); // Simulate user think time
}