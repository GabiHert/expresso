import Service from "../../service";
import Client from "../../client";
import { PaymentSetupRequest, PaymentSetupResponse, PaymentVerificationRequest, PaymentVerificationResponse } from "../../typings/checkout/models";
import { IRequest } from "../../typings/requestOptions";
export declare class ClassicCheckoutSDKApi extends Service {
    private readonly API_BASEPATH;
    private baseUrl;
    constructor(client: Client);
    /**
    * @summary Create a payment session
    * @param paymentSetupRequest {@link PaymentSetupRequest }
    * @param requestOptions {@link IRequest.Options }
    * @return {@link PaymentSetupResponse }
    */
    paymentSession(paymentSetupRequest: PaymentSetupRequest, requestOptions?: IRequest.Options): Promise<PaymentSetupResponse>;
    /**
    * @summary Verify a payment result
    * @param paymentVerificationRequest {@link PaymentVerificationRequest }
    * @param requestOptions {@link IRequest.Options }
    * @return {@link PaymentVerificationResponse }
    */
    verifyPaymentResult(paymentVerificationRequest: PaymentVerificationRequest, requestOptions?: IRequest.Options): Promise<PaymentVerificationResponse>;
}
