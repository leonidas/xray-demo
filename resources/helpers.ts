import * as AWSXRay from 'aws-xray-sdk';

export const traceWithXray = async <T>(
  subsegmentName: string,
  f: () => Promise<T>
) => {
  const subsegment = AWSXRay.getSegment()?.addNewSubsegment(subsegmentName);

  try {
    const result = await f();
    subsegment?.close();
    return result;
  } catch (err) {
    subsegment?.addError((err as Error).message);
    subsegment?.close();
    throw err;
  }
};

export const waitFor100ms = () =>
  new Promise<void>((resolve, _) => setTimeout(() => resolve(), 100));
